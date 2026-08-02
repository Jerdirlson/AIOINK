import Observation
import SwiftUI

/// Estado de sesión de la app. Decide si se muestra el login o el contenido.
@MainActor
@Observable
final class SesionStore {

    enum Estado: Equatable {
        case cargando
        case sinSesion
        case autenticado(Usuario)
    }

    private(set) var estado: Estado = .cargando

    var usuario: Usuario? {
        if case .autenticado(let usuario) = estado { return usuario }
        return nil
    }

    /// Moneda del usuario, con COP como respaldo mientras carga el perfil.
    var moneda: String { usuario?.currency ?? "COP" }

    init() {
        APIClient.shared.alPerderSesion = { [weak self] in
            self?.estado = .sinSesion
        }
    }

    /// Al arrancar: si hay token guardado se valida pidiendo el perfil. Un
    /// token puede seguir en el Keychain pero estar expirado o pertenecer a
    /// una cuenta ya eliminada.
    func restaurar() async {
        guard APIClient.shared.haySesion else {
            estado = .sinSesion
            return
        }

        do {
            estado = .autenticado(try await APIService.perfil())
        } catch {
            APIClient.shared.cerrarSesion()
            estado = .sinSesion
        }
    }

    func iniciarSesion(email: String, password: String) async throws {
        _ = try await APIService.login(email: email, password: password)
        estado = .autenticado(try await APIService.perfil())
    }

    func registrarse(email: String, nombre: String, password: String) async throws {
        _ = try await APIService.registrar(
            email: email, nombre: nombre, password: password
        )
        estado = .autenticado(try await APIService.perfil())
    }

    func cerrarSesion() {
        APIClient.shared.cerrarSesion()
        estado = .sinSesion
    }
}
