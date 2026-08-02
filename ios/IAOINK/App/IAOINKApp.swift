import SwiftUI

@main
struct IAOINKApp: App {

    @State private var sesion = SesionStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(sesion)
                .task { await sesion.restaurar() }
        }
    }
}
