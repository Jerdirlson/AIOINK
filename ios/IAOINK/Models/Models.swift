import Foundation

// Modelos que reflejan las respuestas de la API. Los montos llegan como
// enteros en centavos con signo (ver docs/04): negativo = sale dinero.

// MARK: - Usuario

struct Usuario: Codable, Identifiable, Equatable {
    let id: String
    let email: String
    let name: String
    let avatarUrl: String?
    let currency: String
    let country: String
    let locale: String
}

struct RespuestaAuth: Codable {
    let accessToken: String
    let user: UsuarioResumen

    struct UsuarioResumen: Codable, Equatable {
        let id: String
        let email: String
        let name: String
        let currency: String
    }
}

// MARK: - Cuentas

enum TipoCuenta: String, Codable, CaseIterable {
    case cash = "CASH"
    case debit = "DEBIT"
    case credit = "CREDIT"
    case savings = "SAVINGS"

    var nombre: String {
        switch self {
        case .cash: return "Efectivo"
        case .debit: return "Débito"
        case .credit: return "Crédito"
        case .savings: return "Ahorros"
        }
    }

    var simbolo: String {
        switch self {
        case .cash: return "banknote.fill"
        case .debit: return "creditcard.fill"
        case .credit: return "creditcard"
        case .savings: return "building.columns.fill"
        }
    }
}

struct Cuenta: Codable, Identifiable, Equatable {
    let id: String
    let name: String
    let type: TipoCuenta
    let currency: String
    let isArchived: Bool
    /// Saldo en centavos, calculado por la API como suma de sus transacciones.
    let balance: Int
}

// MARK: - Categorías

enum TipoCategoria: String, Codable {
    case expense = "EXPENSE"
    case income = "INCOME"
    case system = "SYSTEM"
}

struct Categoria: Codable, Identifiable, Equatable {
    let id: String
    let name: String
    /// Nombre de un SF Symbol.
    let icon: String
    let kind: TipoCategoria
    let isSystem: Bool
    /// Slot 1...8 de la paleta de gráficos, o nil para "Otros".
    let colorSlot: Int?
}

// MARK: - Transacciones

enum TipoTransaccion: String, Codable {
    case expense = "EXPENSE"
    case income = "INCOME"
    case transfer = "TRANSFER"
}

enum OrigenTransaccion: String, Codable {
    case manual = "MANUAL"
    case applePay = "APPLE_PAY_SHORTCUT"
    case sms = "SMS"
    case whatsapp = "WHATSAPP"
    case scanAI = "SCAN_AI"
    case micAI = "MIC_AI"
    case notesAI = "NOTES_AI"
    case belvo = "BELVO"

    /// Se muestra solo cuando no fue registro manual, para que el usuario
    /// sepa de dónde salió la transacción.
    var simbolo: String? {
        switch self {
        case .manual: return nil
        case .applePay: return "apple.logo"
        case .sms: return "message.fill"
        case .whatsapp: return "bubble.left.fill"
        case .scanAI: return "camera.fill"
        case .micAI: return "mic.fill"
        case .notesAI: return "sparkles"
        case .belvo: return "building.columns.fill"
        }
    }
}

struct Transaccion: Codable, Identifiable, Equatable {
    let id: String
    let accountId: String
    let categoryId: String
    /// Centavos con signo: negativo = gasto.
    let amount: Int
    let currency: String
    let type: TipoTransaccion
    let description: String
    let note: String?
    let occurredAt: Date
    let source: OrigenTransaccion
    let transferGroupId: String?
    /// Vienen embebidos al listar, para no pedir la categoría aparte.
    let category: CategoriaResumen?
    let account: CuentaResumen?

    struct CategoriaResumen: Codable, Equatable {
        let id: String
        let name: String
        let icon: String
        let colorSlot: Int?
    }

    struct CuentaResumen: Codable, Equatable {
        let id: String
        let name: String
    }

    var esTransferencia: Bool { transferGroupId != nil }
}

struct ListaTransacciones: Codable {
    let items: [Transaccion]
    let total: Int
    let limit: Int
    let offset: Int
}

// MARK: - Reportes

struct ResumenPeriodo: Codable, Equatable {
    let from: Date
    let to: Date
    /// Entradas reales del periodo, en centavos y positivo.
    let income: Int
    /// Salidas reales del periodo, en centavos y positivo.
    let expense: Int
    let balance: Int
}

struct ReportePorCategoria: Codable, Equatable {
    let total: Int
    let items: [CategoriaEnReporte]

    struct CategoriaEnReporte: Codable, Equatable, Identifiable {
        let categoryId: String
        let name: String
        let icon: String
        let colorSlot: Int?
        let total: Int
        let percentage: Double

        var id: String { categoryId }
    }
}

struct MesEnReporte: Codable, Equatable, Identifiable {
    /// Formato "2026-07".
    let month: String
    let income: Int
    let expense: Int
    let balance: Int

    var id: String { month }
}

// MARK: - Cuerpos de petición

struct NuevaTransaccion: Encodable {
    let accountId: String
    let categoryId: String
    let amount: Int
    let type: TipoTransaccion
    let description: String
    let note: String?
    let occurredAt: Date
}

struct NuevaCuenta: Encodable {
    let name: String
    let type: TipoCuenta
    let initialBalance: Int
}

struct CredencialesLogin: Encodable {
    let email: String
    let password: String
}

struct DatosRegistro: Encodable {
    let email: String
    let name: String
    let password: String
}
