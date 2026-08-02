import SwiftUI

/// Placeholder. Los endpoints ya existen (`/reports/summary`, `/by-category`,
/// `/monthly`); falta construir la pantalla con Swift Charts siguiendo las
/// reglas de docs/09 §8.
struct ReportsView: View {

    var body: some View {
        ContentUnavailableView {
            Label("Reportes", systemImage: "chart.bar.fill")
        } description: {
            Text("Próximamente: gasto por categoría y evolución mensual.")
        }
        .navigationTitle("Reportes")
    }
}
