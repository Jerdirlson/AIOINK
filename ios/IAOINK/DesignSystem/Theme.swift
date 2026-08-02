import SwiftUI
import UIKit

/// Tokens de diseño de la app. Ver `docs/09-diseno-sistema.md`.
///
/// Los colores de superficie y texto son los semánticos del sistema: se
/// adaptan solos a claro/oscuro y al modo de contraste aumentado. Los de
/// gráficos y estado sí se definen aquí porque los colores de UI de Apple no
/// sirven como colores de datos (quedan fuera de la banda de luminosidad o no
/// alcanzan 3:1 sobre la superficie).
enum Theme {

    // MARK: - Espaciado

    /// Grid de 8 pt. `xs` (4) queda para ajustes finos dentro de un componente.
    enum Spacing {
        static let xs: CGFloat = 4
        static let s: CGFloat = 8
        static let m: CGFloat = 16
        static let l: CGFloat = 24
        static let xl: CGFloat = 32
    }

    /// Radios continuos (el "squircle" de Apple), nunca circulares.
    enum Radius {
        static let small: CGFloat = 10
        static let card: CGFloat = 16
    }

    // MARK: - Superficies y texto

    enum Colors {
        static let groupedBackground = Color(uiColor: .systemGroupedBackground)
        static let card = Color(uiColor: .secondarySystemGroupedBackground)
        static let label = Color(uiColor: .label)
        static let secondaryLabel = Color(uiColor: .secondaryLabel)
        static let tertiaryLabel = Color(uiColor: .tertiaryLabel)
        static let separator = Color(uiColor: .separator)
    }

    // MARK: - Colores de estado

    /// Reservados: nunca se usan como "serie 4" de un gráfico. Verificados
    /// para contraste de texto (≥ 4.5:1). Los `systemGreen` y `systemOrange`
    /// por defecto de Apple no pasan en modo claro (2.2:1), por eso estos
    /// pasos son más oscuros ahí.
    enum Status {
        static let positive = Color.adaptive(light: 0x1E7F35, dark: 0x30D158)
        static let warning = Color.adaptive(light: 0xB25000, dark: 0xFF9F0A)
        static let critical = Color.adaptive(light: 0xD70015, dark: 0xFF453A)
    }

    /// Color de un monto según su signo. El color es refuerzo: el signo y el
    /// formato de moneda ya comunican el sentido por sí solos.
    static func amountColor(_ cents: Int) -> Color {
        if cents < 0 { return Colors.label }
        return Status.positive
    }
}

// MARK: - Paleta de gráficos

/// Ocho slots en orden fijo, asignados en secuencia y nunca reciclados.
/// Validada en claro y oscuro: banda de luminosidad, croma mínimo, separación
/// para daltonismo protan/deutan y contraste sobre la superficie.
/// La categoría sin slot (la novena en adelante) cae en `fallback`.
enum ChartPalette {

    private static let slots: [(light: UInt32, dark: UInt32)] = [
        (0x0A6FD8, 0x0A84FF), // 1 · azul
        (0xC87400, 0xCE7B00), // 2 · ámbar
        (0x0C8EA5, 0x1E9EB8), // 3 · teal
        (0xE52B50, 0xFF375F), // 4 · rosa
        (0x5856D6, 0x5E5CE6), // 5 · índigo
        (0x2A9D4E, 0x22A54B), // 6 · verde
        (0xAF52DE, 0xBF5AF2), // 7 · púrpura
        (0xA85D1F, 0xB0662A), // 8 · bronce
    ]

    static let fallback = Color(uiColor: .systemGray)

    /// - Parameter slot: 1...8 tal como lo devuelve la API. `nil` o fuera de
    ///   rango cae en el gris de "Otros".
    static func color(slot: Int?) -> Color {
        guard let slot, slots.indices.contains(slot - 1) else { return fallback }
        let par = slots[slot - 1]
        return Color.adaptive(light: par.light, dark: par.dark)
    }
}

// MARK: - Utilidades de color

extension Color {
    /// Color que cambia con la apariencia del sistema. Se usa solo para
    /// gráficos y estado; las superficies y el texto usan los semánticos.
    static func adaptive(light: UInt32, dark: UInt32) -> Color {
        Color(uiColor: UIColor { traits in
            UIColor(hex: traits.userInterfaceStyle == .dark ? dark : light)
        })
    }
}

extension UIColor {
    convenience init(hex: UInt32) {
        self.init(
            red: CGFloat((hex >> 16) & 0xFF) / 255,
            green: CGFloat((hex >> 8) & 0xFF) / 255,
            blue: CGFloat(hex & 0xFF) / 255,
            alpha: 1
        )
    }
}

// MARK: - Modificadores reutilizables

private struct CardStyle: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding(Theme.Spacing.m)
            .background(Theme.Colors.card)
            .clipShape(
                RoundedRectangle(cornerRadius: Theme.Radius.card, style: .continuous)
            )
    }
}

extension View {
    /// Tarjeta estándar: superficie del sistema y radio continuo, sin sombra.
    /// La jerarquía la da el contraste entre superficies, no el relieve.
    func cardStyle() -> some View {
        modifier(CardStyle())
    }
}
