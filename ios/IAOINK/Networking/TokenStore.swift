import Foundation
import Security

/// Guarda el JWT en el Keychain, no en `UserDefaults`: es una credencial y
/// `UserDefaults` se almacena en claro dentro del contenedor de la app.
enum TokenStore {

    private static let servicio = "app.iaoink.IAOINK"
    private static let cuenta = "accessToken"

    static func guardar(_ token: String) {
        guard let datos = token.data(using: .utf8) else { return }

        // Se borra primero: SecItemAdd falla con errSecDuplicateItem si ya
        // existe, y actualizar exige otra llamada distinta.
        borrar()

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: servicio,
            kSecAttrAccount as String: cuenta,
            kSecValueData as String: datos,
            // Sin sincronización a iCloud y solo accesible con el
            // dispositivo desbloqueado.
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
        ]

        SecItemAdd(query as CFDictionary, nil)
    }

    static func leer() -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: servicio,
            kSecAttrAccount as String: cuenta,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]

        var resultado: AnyObject?
        let estado = SecItemCopyMatching(query as CFDictionary, &resultado)

        guard estado == errSecSuccess,
              let datos = resultado as? Data,
              let token = String(data: datos, encoding: .utf8)
        else { return nil }

        return token
    }

    static func borrar() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: servicio,
            kSecAttrAccount as String: cuenta,
        ]

        SecItemDelete(query as CFDictionary)
    }
}
