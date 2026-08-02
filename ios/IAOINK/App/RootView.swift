import SwiftUI

struct RootView: View {

    @Environment(SesionStore.self) private var sesion

    var body: some View {
        switch sesion.estado {
        case .cargando:
            ProgressView()
                .controlSize(.large)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Theme.Colors.groupedBackground)

        case .sinSesion:
            LoginView()

        case .autenticado:
            MainTabView()
        }
    }
}

/// Las cuatro secciones de la app. El botón de añadir NO va flotando sobre la
/// tab bar (eso es un patrón de Material Design): vive en la toolbar de cada
/// pantalla. Ver docs/09 §6.
struct MainTabView: View {

    var body: some View {
        TabView {
            NavigationStack {
                HomeView()
            }
            .tabItem {
                Label("Inicio", systemImage: "house.fill")
            }

            NavigationStack {
                TransactionsView()
            }
            .tabItem {
                Label("Transacciones", systemImage: "arrow.left.arrow.right")
            }

            NavigationStack {
                ReportsView()
            }
            .tabItem {
                Label("Reportes", systemImage: "chart.bar.fill")
            }

            NavigationStack {
                ProfileView()
            }
            .tabItem {
                Label("Perfil", systemImage: "person.fill")
            }
        }
    }
}
