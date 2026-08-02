import Foundation
import Observation

@MainActor
@Observable
final class TransactionsViewModel {

    /// Transacciones agrupadas por día, que es como las lee el usuario.
    struct GrupoDia: Identifiable {
        let fecha: Date
        let items: [Transaccion]

        var id: Date { fecha }
        var titulo: String { FechaTexto.encabezado(fecha) }
    }

    private(set) var grupos: [GrupoDia] = []
    private(set) var categorias: [Categoria] = []
    private(set) var cargando = false
    private(set) var mensajeError: String?
    private(set) var hayMas = false

    var categoriaFiltrada: Categoria? {
        didSet {
            guard categoriaFiltrada != oldValue else { return }
            Task { await recargar() }
        }
    }

    private var transacciones: [Transaccion] = []
    private var offset = 0
    private let tamanoPagina = 50

    var vacio: Bool { transacciones.isEmpty && !cargando }

    func cargarInicial() async {
        if categorias.isEmpty {
            categorias = (try? await APIService.categorias())?
                .filter { !$0.isSystem } ?? []
        }
        await recargar()
    }

    func recargar() async {
        offset = 0
        transacciones = []
        await cargarPagina()
    }

    /// Paginación: se pide la siguiente página al llegar al final de la lista.
    func cargarSiguientePaginaSiHace(falta transaccion: Transaccion) async {
        guard hayMas, !cargando, transaccion.id == transacciones.last?.id else {
            return
        }
        await cargarPagina()
    }

    private func cargarPagina() async {
        cargando = true
        mensajeError = nil

        do {
            let lista = try await APIService.transacciones(
                limite: tamanoPagina,
                offset: offset,
                categoriaId: categoriaFiltrada?.id
            )

            transacciones.append(contentsOf: lista.items)
            offset += lista.items.count
            hayMas = transacciones.count < lista.total
            grupos = Self.agrupar(transacciones)
        } catch is CancellationError {
            // Vista descartada mientras cargaba.
        } catch {
            mensajeError = error.localizedDescription
        }

        cargando = false
    }

    func eliminar(_ transaccion: Transaccion) async {
        do {
            try await APIService.eliminarTransaccion(id: transaccion.id)
            await recargar()
        } catch {
            mensajeError = error.localizedDescription
        }
    }

    private static func agrupar(_ items: [Transaccion]) -> [GrupoDia] {
        let porDia = Dictionary(grouping: items) {
            FechaTexto.inicioDelDia($0.occurredAt)
        }

        return porDia
            .map { GrupoDia(fecha: $0.key, items: $0.value) }
            .sorted { $0.fecha > $1.fecha }
    }
}
