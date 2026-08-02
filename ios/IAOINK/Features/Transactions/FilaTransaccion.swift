import SwiftUI

/// Fila de una transacción. Se comparte entre el dashboard y el listado
/// completo para que se vean igual en ambos sitios.
struct FilaTransaccion: View {

    let transaccion: Transaccion
    let moneda: String

    private var colorCategoria: Color {
        ChartPalette.color(slot: transaccion.category?.colorSlot)
    }

    private var simbolo: String {
        transaccion.category?.icon ?? "ellipsis.circle.fill"
    }

    var body: some View {
        HStack(spacing: Theme.Spacing.m) {
            icono

            VStack(alignment: .leading, spacing: 2) {
                Text(transaccion.description)
                    .font(.body)
                    .foregroundStyle(Theme.Colors.label)
                    .lineLimit(1)

                HStack(spacing: Theme.Spacing.xs) {
                    Text(transaccion.category?.name ?? "Sin categoría")
                        .font(.subheadline)
                        .foregroundStyle(Theme.Colors.secondaryLabel)

                    if let origen = transaccion.source.simbolo {
                        Image(systemName: origen)
                            .font(.caption2)
                            .foregroundStyle(Theme.Colors.tertiaryLabel)
                            .accessibilityHidden(true)
                    }
                }
                .lineLimit(1)
            }

            Spacer(minLength: Theme.Spacing.s)

            Text(Money.format(cents: transaccion.amount, currency: moneda))
                .font(.body)
                .monospacedDigit()
                .foregroundStyle(Theme.amountColor(transaccion.amount))
                .lineLimit(1)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(etiquetaAccesible)
    }

    private var icono: some View {
        Image(systemName: simbolo)
            .font(.system(size: 16))
            .foregroundStyle(colorCategoria)
            .frame(width: 36, height: 36)
            .background(colorCategoria.opacity(0.15))
            .clipShape(Circle())
            .accessibilityHidden(true)
    }

    /// VoiceOver lee el monto como dinero, no como una ristra de dígitos, y
    /// dice explícitamente si es gasto o ingreso: el color no basta.
    private var etiquetaAccesible: String {
        let sentido = transaccion.amount < 0 ? "Gasto" : "Ingreso"
        let categoria = transaccion.category?.name ?? "sin categoría"
        let monto = Money.format(
            cents: transaccion.amount, currency: moneda, signo: .absolute
        )
        return "\(sentido) de \(monto). \(transaccion.description), \(categoria)."
    }
}
