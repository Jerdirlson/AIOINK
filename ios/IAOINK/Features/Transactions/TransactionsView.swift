import SwiftUI

struct TransactionsView: View {

    @Environment(SesionStore.self) private var sesion
    @State private var modelo = TransactionsViewModel()
    @State private var mostrandoNueva = false

    private var moneda: String { sesion.moneda }

    var body: some View {
        List {
            ForEach(modelo.grupos) { grupo in
                Section(grupo.titulo) {
                    ForEach(grupo.items) { transaccion in
                        FilaTransaccion(transaccion: transaccion, moneda: moneda)
                            .swipeActions(edge: .trailing) {
                                Button(role: .destructive) {
                                    Task { await modelo.eliminar(transaccion) }
                                } label: {
                                    Label("Eliminar", systemImage: "trash")
                                }
                            }
                            .task {
                                await modelo.cargarSiguientePaginaSiHace(
                                    falta: transaccion
                                )
                            }
                    }
                }
            }

            if modelo.cargando && !modelo.grupos.isEmpty {
                HStack {
                    Spacer()
                    ProgressView()
                    Spacer()
                }
                .listRowBackground(Color.clear)
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle("Transacciones")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                menuFiltro
            }

            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    mostrandoNueva = true
                } label: {
                    Label("Añadir", systemImage: "plus")
                }
            }
        }
        .refreshable { await modelo.recargar() }
        .task { await modelo.cargarInicial() }
        .sheet(isPresented: $mostrandoNueva) {
            NuevaTransaccionView { await modelo.recargar() }
        }
        .overlay {
            if modelo.vacio {
                ContentUnavailableView {
                    Label("Sin transacciones", systemImage: "list.bullet")
                } description: {
                    Text(
                        modelo.categoriaFiltrada == nil
                            ? "Cuando registres un movimiento aparecerá aquí."
                            : "No hay movimientos en esta categoría."
                    )
                }
            }
        }
    }

    /// Filtro con `Menu` nativo en vez de chips propios (docs/09 §5).
    private var menuFiltro: some View {
        Menu {
            Button {
                modelo.categoriaFiltrada = nil
            } label: {
                Label(
                    "Todas",
                    systemImage: modelo.categoriaFiltrada == nil
                        ? "checkmark"
                        : "line.3.horizontal"
                )
            }

            Divider()

            ForEach(modelo.categorias) { categoria in
                Button {
                    modelo.categoriaFiltrada = categoria
                } label: {
                    Label(
                        categoria.name,
                        systemImage: modelo.categoriaFiltrada?.id == categoria.id
                            ? "checkmark"
                            : categoria.icon
                    )
                }
            }
        } label: {
            Label("Filtrar", systemImage: "line.3.horizontal.decrease.circle")
        }
    }
}
