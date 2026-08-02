import Observation

@MainActor
@Observable
final class HomeViewModel {

    private(set) var cuentas: [Cuenta] = []
    private(set) var resumen: ResumenPeriodo?
    private(set) var ultimas: [Transaccion] = []
    private(set) var cargando = false
    private(set) var mensajeError: String?

    /// Suma de todas las cuentas, en centavos.
    var patrimonio: Int {
        cuentas.reduce(0) { $0 + $1.balance }
    }

    var sinDatos: Bool {
        cuentas.isEmpty && ultimas.isEmpty && !cargando
    }

    func cargar() async {
        cargando = true
        mensajeError = nil

        do {
            // En paralelo: son tres consultas independientes y en serie se
            // notaría el retraso al abrir la app.
            async let cuentasTask = APIService.cuentas()
            async let resumenTask = APIService.resumen()
            async let ultimasTask = APIService.transacciones(limite: 5)

            cuentas = try await cuentasTask
            resumen = try await resumenTask

            let lista = try await ultimasTask
            ultimas = lista.items
        } catch is CancellationError {
            // La vista desapareció mientras cargaba: no es un error que
            // debamos mostrarle al usuario.
        } catch {
            mensajeError = error.localizedDescription
        }

        cargando = false
    }
}
