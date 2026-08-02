import Foundation

/// Dónde vive la API.
///
/// El simulador llega al backend del Mac por `localhost`. Desde un iPhone
/// real hay que apuntar a la IP del Mac en la red local: se puede sobrescribir
/// sin recompilar guardando `apiBaseURL` en UserDefaults.
enum AppConfig {
    static var baseURL: URL {
        if let personalizada = UserDefaults.standard.string(forKey: "apiBaseURL"),
           let url = URL(string: personalizada) {
            return url
        }
        return URL(string: "http://localhost:3000/api")!
    }
}

/// Cliente HTTP de la API. Una sola instancia compartida para que el token
/// viva en un solo sitio.
@MainActor
final class APIClient {

    static let shared = APIClient()

    private let session: URLSession
    private var token: String?

    /// Se dispara cuando el servidor rechaza el token, para que la app vuelva
    /// a la pantalla de login.
    var alPerderSesion: (() -> Void)?

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 20
        config.waitsForConnectivity = true
        session = URLSession(configuration: config)

        token = TokenStore.leer()
    }

    var haySesion: Bool { token != nil }

    func guardarSesion(token nuevo: String) {
        token = nuevo
        TokenStore.guardar(nuevo)
    }

    func cerrarSesion() {
        token = nil
        TokenStore.borrar()
    }

    // MARK: - Codificación

    /// Prisma serializa las fechas en ISO 8601 con milisegundos
    /// ("2026-08-02T03:26:50.814Z"), que la estrategia `.iso8601` de
    /// Foundation NO acepta. Se prueban ambas formas.
    private static let decodificadorFechas: (Decoder) throws -> Date = { decoder in
        let texto = try decoder.singleValueContainer().decode(String.self)

        if let fecha = ISO8601DateFormatter.conMilisegundos.date(from: texto) {
            return fecha
        }
        if let fecha = ISO8601DateFormatter.sinMilisegundos.date(from: texto) {
            return fecha
        }

        throw DecodingError.dataCorrupted(
            .init(
                codingPath: decoder.codingPath,
                debugDescription: "Fecha ISO 8601 no reconocida: \(texto)"
            )
        )
    }

    private lazy var decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.dateDecodingStrategy = .custom(Self.decodificadorFechas)
        return d
    }()

    private lazy var encoder: JSONEncoder = {
        let e = JSONEncoder()
        e.dateEncodingStrategy = .custom { fecha, encoder in
            var contenedor = encoder.singleValueContainer()
            try contenedor.encode(
                ISO8601DateFormatter.conMilisegundos.string(from: fecha)
            )
        }
        return e
    }()

    // MARK: - Petición genérica

    /// Petición sin cuerpo.
    func request<Respuesta: Decodable>(
        _ metodo: MetodoHTTP,
        _ ruta: String,
        query: [URLQueryItem] = [],
        autenticada: Bool = true
    ) async throws -> Respuesta {
        let datos = try await ejecutar(
            metodo, ruta, query: query, cuerpo: nil, autenticada: autenticada
        )
        return try procesar(datos)
    }

    /// Petición con cuerpo. El tipo del cuerpo es un genérico y no un
    /// `any Encodable` para no depender de la apertura implícita de
    /// existenciales al codificarlo.
    func request<Cuerpo: Encodable, Respuesta: Decodable>(
        _ metodo: MetodoHTTP,
        _ ruta: String,
        query: [URLQueryItem] = [],
        cuerpo: Cuerpo,
        autenticada: Bool = true
    ) async throws -> Respuesta {
        let codificado = try encoder.encode(cuerpo)

        let datos = try await ejecutar(
            metodo, ruta, query: query, cuerpo: codificado,
            autenticada: autenticada
        )
        return try procesar(datos)
    }

    private func procesar<Respuesta: Decodable>(_ datos: Data) throws -> Respuesta {
        // 204 No Content: no hay nada que decodificar.
        if datos.isEmpty, let vacia = VacioDecodable() as? Respuesta {
            return vacia
        }

        do {
            return try decoder.decode(Respuesta.self, from: datos)
        } catch {
            throw APIError.decodificacion(error.localizedDescription)
        }
    }

    /// Variante para endpoints que no devuelven cuerpo (DELETE).
    @discardableResult
    func requestSinRespuesta(
        _ metodo: MetodoHTTP,
        _ ruta: String,
        query: [URLQueryItem] = []
    ) async throws -> Data {
        try await ejecutar(metodo, ruta, query: query, cuerpo: nil, autenticada: true)
    }

    private func ejecutar(
        _ metodo: MetodoHTTP,
        _ ruta: String,
        query: [URLQueryItem],
        cuerpo: Data?,
        autenticada: Bool
    ) async throws -> Data {
        guard var componentes = URLComponents(
            url: AppConfig.baseURL.appendingPathComponent(ruta),
            resolvingAgainstBaseURL: false
        ) else {
            throw APIError.respuestaInvalida
        }

        if !query.isEmpty {
            componentes.queryItems = query
        }

        guard let url = componentes.url else { throw APIError.respuestaInvalida }

        var peticion = URLRequest(url: url)
        peticion.httpMethod = metodo.rawValue

        if autenticada, let token {
            peticion.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let cuerpo {
            peticion.setValue("application/json", forHTTPHeaderField: "Content-Type")
            peticion.httpBody = cuerpo
        }

        let datos: Data
        let respuesta: URLResponse

        do {
            (datos, respuesta) = try await session.data(for: peticion)
        } catch let error as URLError {
            throw error.code == .notConnectedToInternet
                ? APIError.sinConexion
                : APIError.respuestaInvalida
        }

        guard let http = respuesta as? HTTPURLResponse else {
            throw APIError.respuestaInvalida
        }

        guard (200..<300).contains(http.statusCode) else {
            if http.statusCode == 401 {
                cerrarSesion()
                alPerderSesion?()
                throw APIError.noAutenticado
            }

            let mensaje = (try? decoder.decode(ErrorAPI.self, from: datos))?.message
                ?? "Error \(http.statusCode)"

            throw APIError.servidor(codigo: http.statusCode, mensaje: mensaje)
        }

        return datos
    }
}

enum MetodoHTTP: String {
    case get = "GET"
    case post = "POST"
    case patch = "PATCH"
    case delete = "DELETE"
}

/// Marcador para respuestas 204 sin cuerpo.
struct VacioDecodable: Decodable {}

extension ISO8601DateFormatter {
    static let conMilisegundos: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()

    static let sinMilisegundos: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        return f
    }()
}
