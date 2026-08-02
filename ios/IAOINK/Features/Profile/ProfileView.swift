import SwiftUI

struct ProfileView: View {

    @Environment(SesionStore.self) private var sesion
    @State private var mostrandoCierreSesion = false

    var body: some View {
        List {
            if let usuario = sesion.usuario {
                Section {
                    VStack(alignment: .leading, spacing: Theme.Spacing.xs) {
                        Text(usuario.name)
                            .font(.headline)
                        Text(usuario.email)
                            .font(.subheadline)
                            .foregroundStyle(Theme.Colors.secondaryLabel)
                    }
                    .padding(.vertical, Theme.Spacing.xs)
                }

                Section("Configuración") {
                    LabeledContent("Moneda", value: usuario.currency)
                    LabeledContent("País", value: usuario.country)
                }
            }

            Section {
                Button("Cerrar sesión", role: .destructive) {
                    mostrandoCierreSesion = true
                }
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle("Perfil")
        .navigationBarTitleDisplayMode(.large)
        .confirmationDialog(
            "¿Cerrar sesión?",
            isPresented: $mostrandoCierreSesion,
            titleVisibility: .visible
        ) {
            Button("Cerrar sesión", role: .destructive) {
                sesion.cerrarSesion()
            }
            Button("Cancelar", role: .cancel) {}
        }
    }
}
