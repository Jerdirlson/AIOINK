import SwiftUI

/// Registro manual de un gasto o ingreso. Es el fallback de todos los canales
/// automáticos (docs/06) y por eso está siempre a un toque de distancia.
struct NuevaTransaccionView: View {

    /// Se llama tras guardar, para que la pantalla que la abrió se refresque.
    let alGuardar: () async -> Void

    @Environment(\.dismiss) private var dismiss
    @Environment(SesionStore.self) private var sesion

    @State private var cuentas: [Cuenta] = []
    @State private var categorias: [Categoria] = []

    @State private var esGasto = true
    @State private var montoTexto = ""
    @State private var descripcion = ""
    @State private var nota = ""
    @State private var fecha = Date()
    @State private var cuentaId: String?
    @State private var categoriaId: String?

    @State private var guardando = false
    @State private var cargandoDatos = true
    @State private var mensajeError: String?

    @FocusState private var montoEnfocado: Bool

    private var moneda: String { sesion.moneda }

    /// El usuario escribe pesos; la API recibe centavos.
    private var montoEnCentavos: Int? {
        let limpio = montoTexto
            .replacingOccurrences(of: ".", with: "")
            .replacingOccurrences(of: ",", with: "")
            .trimmingCharacters(in: .whitespaces)

        guard let pesos = Int(limpio), pesos > 0 else { return nil }
        return pesos * 100
    }

    private var categoriasVisibles: [Categoria] {
        categorias.filter { $0.kind == (esGasto ? .expense : .income) }
    }

    private var puedeGuardar: Bool {
        montoEnCentavos != nil
            && !descripcion.trimmingCharacters(in: .whitespaces).isEmpty
            && cuentaId != nil
            && categoriaId != nil
            && !guardando
    }

    var body: some View {
        NavigationStack {
            Form {
                if cargandoDatos {
                    ProgressView()
                        .frame(maxWidth: .infinity)
                        .listRowBackground(Color.clear)
                } else if cuentas.isEmpty {
                    ContentUnavailableView {
                        Label("Sin cuentas", systemImage: "creditcard")
                    } description: {
                        Text("Crea una cuenta antes de registrar movimientos.")
                    }
                    .listRowBackground(Color.clear)
                } else {
                    seccionTipo
                    seccionMonto
                    seccionDetalle

                    if let mensajeError {
                        Section {
                            Text(mensajeError)
                                .font(.footnote)
                                .foregroundStyle(Theme.Status.critical)
                        }
                    }
                }
            }
            .navigationTitle("Nuevo movimiento")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar") { dismiss() }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button("Guardar") {
                        Task { await guardar() }
                    }
                    .disabled(!puedeGuardar)
                }
            }
            .task { await cargarDatos() }
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
    }

    private var seccionTipo: some View {
        Section {
            Picker("Tipo", selection: $esGasto) {
                Text("Gasto").tag(true)
                Text("Ingreso").tag(false)
            }
            .pickerStyle(.segmented)
            .onChange(of: esGasto) {
                // La categoría anterior puede no aplicar al nuevo tipo.
                categoriaId = categoriasVisibles.first?.id
            }
        }
    }

    private var seccionMonto: some View {
        Section("Monto") {
            HStack {
                Text(simboloMoneda)
                    .foregroundStyle(Theme.Colors.secondaryLabel)

                TextField("0", text: $montoTexto)
                    .keyboardType(.numberPad)
                    .font(.title2.weight(.semibold))
                    .monospacedDigit()
                    .focused($montoEnfocado)
            }
        }
    }

    private var seccionDetalle: some View {
        Section {
            TextField("Descripción", text: $descripcion)

            Picker("Cuenta", selection: $cuentaId) {
                ForEach(cuentas) { cuenta in
                    Text(cuenta.name).tag(Optional(cuenta.id))
                }
            }

            Picker("Categoría", selection: $categoriaId) {
                ForEach(categoriasVisibles) { categoria in
                    Label(categoria.name, systemImage: categoria.icon)
                        .tag(Optional(categoria.id))
                }
            }

            DatePicker(
                "Fecha",
                selection: $fecha,
                in: ...Date(),
                displayedComponents: .date
            )

            TextField("Nota (opcional)", text: $nota, axis: .vertical)
                .lineLimit(1...3)
        }
    }

    private var simboloMoneda: String {
        moneda == "COP" ? "$" : moneda
    }

    private func cargarDatos() async {
        cargandoDatos = true

        do {
            async let cuentasTask = APIService.cuentas()
            async let categoriasTask = APIService.categorias()

            cuentas = try await cuentasTask
            categorias = try await categoriasTask.filter { !$0.isSystem }

            cuentaId = cuentas.first?.id
            categoriaId = categoriasVisibles.first?.id
        } catch {
            mensajeError = error.localizedDescription
        }

        cargandoDatos = false
        montoEnfocado = true
    }

    private func guardar() async {
        guard let centavos = montoEnCentavos,
              let cuentaId,
              let categoriaId
        else { return }

        guardando = true
        mensajeError = nil

        // El signo lo determina el tipo: la API rechaza un gasto positivo.
        let monto = esGasto ? -centavos : centavos
        let notaLimpia = nota.trimmingCharacters(in: .whitespaces)

        do {
            _ = try await APIService.crearTransaccion(
                NuevaTransaccion(
                    accountId: cuentaId,
                    categoryId: categoriaId,
                    amount: monto,
                    type: esGasto ? .expense : .income,
                    description: descripcion.trimmingCharacters(in: .whitespaces),
                    note: notaLimpia.isEmpty ? nil : notaLimpia,
                    occurredAt: fecha
                )
            )

            await alGuardar()
            dismiss()
        } catch {
            mensajeError = error.localizedDescription
        }

        guardando = false
    }
}
