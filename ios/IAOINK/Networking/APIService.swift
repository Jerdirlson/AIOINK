import Foundation

/// Las rutas concretas de la API, en un solo sitio. Las vistas hablan con
/// esto y nunca arman URLs a mano.
@MainActor
enum APIService {

    private static var cliente: APIClient { APIClient.shared }

    // MARK: - Auth

    static func login(email: String, password: String) async throws -> RespuestaAuth {
        let respuesta: RespuestaAuth = try await cliente.request(
            .post,
            "auth/login",
            cuerpo: CredencialesLogin(email: email, password: password),
            autenticada: false
        )
        cliente.guardarSesion(token: respuesta.accessToken)
        return respuesta
    }

    static func registrar(
        email: String,
        nombre: String,
        password: String
    ) async throws -> RespuestaAuth {
        let respuesta: RespuestaAuth = try await cliente.request(
            .post,
            "auth/register",
            cuerpo: DatosRegistro(email: email, name: nombre, password: password),
            autenticada: false
        )
        cliente.guardarSesion(token: respuesta.accessToken)
        return respuesta
    }

    static func perfil() async throws -> Usuario {
        try await cliente.request(.get, "users/me")
    }

    // MARK: - Cuentas

    static func cuentas() async throws -> [Cuenta] {
        try await cliente.request(.get, "accounts")
    }

    static func crearCuenta(_ nueva: NuevaCuenta) async throws -> Cuenta {
        try await cliente.request(.post, "accounts", cuerpo: nueva)
    }

    // MARK: - Categorías

    static func categorias() async throws -> [Categoria] {
        try await cliente.request(.get, "categories")
    }

    // MARK: - Transacciones

    static func transacciones(
        limite: Int = 50,
        offset: Int = 0,
        cuentaId: String? = nil,
        categoriaId: String? = nil,
        desde: Date? = nil,
        hasta: Date? = nil
    ) async throws -> ListaTransacciones {
        var query = [
            URLQueryItem(name: "limit", value: String(limite)),
            URLQueryItem(name: "offset", value: String(offset)),
        ]

        if let cuentaId {
            query.append(URLQueryItem(name: "accountId", value: cuentaId))
        }
        if let categoriaId {
            query.append(URLQueryItem(name: "categoryId", value: categoriaId))
        }
        if let desde {
            query.append(
                URLQueryItem(
                    name: "from",
                    value: ISO8601DateFormatter.conMilisegundos.string(from: desde)
                )
            )
        }
        if let hasta {
            query.append(
                URLQueryItem(
                    name: "to",
                    value: ISO8601DateFormatter.conMilisegundos.string(from: hasta)
                )
            )
        }

        return try await cliente.request(.get, "transactions", query: query)
    }

    static func crearTransaccion(_ nueva: NuevaTransaccion) async throws -> Transaccion {
        try await cliente.request(.post, "transactions", cuerpo: nueva)
    }

    static func eliminarTransaccion(id: String) async throws {
        try await cliente.requestSinRespuesta(.delete, "transactions/\(id)")
    }

    // MARK: - Reportes

    static func resumen(desde: Date? = nil, hasta: Date? = nil) async throws -> ResumenPeriodo {
        try await cliente.request(.get, "reports/summary", query: rango(desde, hasta))
    }

    static func gastoPorCategoria(
        desde: Date? = nil,
        hasta: Date? = nil
    ) async throws -> ReportePorCategoria {
        try await cliente.request(.get, "reports/by-category", query: rango(desde, hasta))
    }

    static func serieMensual(meses: Int = 6) async throws -> [MesEnReporte] {
        try await cliente.request(
            .get,
            "reports/monthly",
            query: [URLQueryItem(name: "months", value: String(meses))]
        )
    }

    private static func rango(_ desde: Date?, _ hasta: Date?) -> [URLQueryItem] {
        var query: [URLQueryItem] = []
        if let desde {
            query.append(
                URLQueryItem(
                    name: "from",
                    value: ISO8601DateFormatter.conMilisegundos.string(from: desde)
                )
            )
        }
        if let hasta {
            query.append(
                URLQueryItem(
                    name: "to",
                    value: ISO8601DateFormatter.conMilisegundos.string(from: hasta)
                )
            )
        }
        return query
    }
}
