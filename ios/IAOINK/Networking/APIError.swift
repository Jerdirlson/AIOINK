import Foundation

enum APIError: LocalizedError, Equatable {
    /// El servidor respondió con un error de negocio o de validación.
    case servidor(codigo: Int, mensaje: String)
    /// El token no sirve: hay que volver a iniciar sesión.
    case noAutenticado
    case sinConexion
    case respuestaInvalida
    case decodificacion(String)

    var errorDescription: String? {
        switch self {
        case .servidor(_, let mensaje):
            return mensaje
        case .noAutenticado:
            return "Tu sesión expiró. Inicia sesión de nuevo."
        case .sinConexion:
            return "No hay conexión. Revisa tu red e inténtalo otra vez."
        case .respuestaInvalida:
            return "El servidor devolvió una respuesta inesperada."
        case .decodificacion(let detalle):
            return "No se pudo leer la respuesta del servidor. \(detalle)"
        }
    }
}

/// Cuerpo de error de NestJS. `message` es un string en los errores de
/// negocio y un arreglo cuando falla la validación de varios campos, así que
/// hay que aceptar ambas formas.
struct ErrorAPI: Decodable {
    let statusCode: Int?
    let message: String

    private enum CodingKeys: String, CodingKey {
        case statusCode, message
    }

    init(from decoder: Decoder) throws {
        let contenedor = try decoder.container(keyedBy: CodingKeys.self)
        statusCode = try contenedor.decodeIfPresent(Int.self, forKey: .statusCode)

        if let unico = try? contenedor.decode(String.self, forKey: .message) {
            message = unico
        } else if let varios = try? contenedor.decode([String].self, forKey: .message) {
            message = varios.joined(separator: "\n")
        } else {
            message = "Ocurrió un error inesperado."
        }
    }
}
