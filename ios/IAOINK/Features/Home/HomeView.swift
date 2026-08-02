import SwiftUI

struct HomeView: View {

    @Environment(SesionStore.self) private var sesion
    @State private var modelo = HomeViewModel()
    @State private var mostrandoNuevaTransaccion = false

    private var moneda: String { sesion.moneda }

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: Theme.Spacing.l) {
                if let mensajeError = modelo.mensajeError {
                    avisoError(mensajeError)
                }

                seccionCuentas
                seccionResumen
                seccionUltimas
            }
            .padding(Theme.Spacing.m)
        }
        .background(Theme.Colors.groupedBackground)
        .navigationTitle("Inicio")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    mostrandoNuevaTransaccion = true
                } label: {
                    Label("Añadir", systemImage: "plus")
                }
            }
        }
        .refreshable { await modelo.cargar() }
        .task { await modelo.cargar() }
        .sheet(isPresented: $mostrandoNuevaTransaccion) {
            NuevaTransaccionView { await modelo.cargar() }
        }
        .overlay {
            if modelo.sinDatos {
                ContentUnavailableView {
                    Label("Aún no hay nada", systemImage: "tray")
                } description: {
                    Text("Crea una cuenta y registra tu primer movimiento.")
                }
            }
        }
    }

    // MARK: - Cuentas

    private var seccionCuentas: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.s) {
            encabezadoSeccion("Mis cuentas")

            if modelo.cuentas.isEmpty {
                Text("Sin cuentas todavía")
                    .font(.subheadline)
                    .foregroundStyle(Theme.Colors.secondaryLabel)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .cardStyle()
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: Theme.Spacing.s) {
                        ForEach(modelo.cuentas) { cuenta in
                            TarjetaCuenta(cuenta: cuenta)
                        }
                    }
                    // El padding va dentro del scroll para que las tarjetas
                    // no queden cortadas contra el borde.
                    .padding(.horizontal, 1)
                }
                .scrollClipDisabled()
            }
        }
    }

    // MARK: - Resumen del mes

    private var seccionResumen: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.s) {
            encabezadoSeccion("Este mes")

            HStack(spacing: Theme.Spacing.s) {
                TarjetaKPI(
                    titulo: "Saldo + ahorros",
                    subtitulo: "Todas las cuentas",
                    monto: modelo.patrimonio,
                    moneda: moneda,
                    color: Theme.Colors.label
                )

                TarjetaKPI(
                    titulo: "Gastos",
                    subtitulo: "Del mes",
                    monto: -(modelo.resumen?.expense ?? 0),
                    moneda: moneda,
                    color: Theme.Colors.label
                )
            }
        }
    }

    // MARK: - Últimas transacciones

    private var seccionUltimas: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.s) {
            encabezadoSeccion("Últimas transacciones")

            if modelo.ultimas.isEmpty {
                Text("Sin movimientos todavía")
                    .font(.subheadline)
                    .foregroundStyle(Theme.Colors.secondaryLabel)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .cardStyle()
            } else {
                VStack(spacing: 0) {
                    ForEach(Array(modelo.ultimas.enumerated()), id: \.element.id) { indice, transaccion in
                        FilaTransaccion(transaccion: transaccion, moneda: moneda)
                            .padding(.vertical, Theme.Spacing.s)

                        if indice < modelo.ultimas.count - 1 {
                            Divider().overlay(Theme.Colors.separator)
                        }
                    }
                }
                .padding(.horizontal, Theme.Spacing.m)
                .padding(.vertical, Theme.Spacing.xs)
                .background(Theme.Colors.card)
                .clipShape(
                    RoundedRectangle(cornerRadius: Theme.Radius.card, style: .continuous)
                )
            }
        }
    }

    // MARK: - Piezas comunes

    private func encabezadoSeccion(_ titulo: String) -> some View {
        Text(titulo)
            .font(.headline)
            .foregroundStyle(Theme.Colors.label)
    }

    private func avisoError(_ mensaje: String) -> some View {
        Label(mensaje, systemImage: "exclamationmark.triangle.fill")
            .font(.footnote)
            .foregroundStyle(Theme.Status.critical)
            .frame(maxWidth: .infinity, alignment: .leading)
            .cardStyle()
    }
}

// MARK: - Tarjeta de cuenta

struct TarjetaCuenta: View {

    let cuenta: Cuenta

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.s) {
            HStack(spacing: Theme.Spacing.xs) {
                Image(systemName: cuenta.type.simbolo)
                    .symbolRenderingMode(.hierarchical)
                    .foregroundStyle(Color.accentColor)

                Text(cuenta.currency)
                    .font(.caption2)
                    .foregroundStyle(Theme.Colors.secondaryLabel)
            }

            Text(cuenta.name)
                .font(.subheadline)
                .foregroundStyle(Theme.Colors.secondaryLabel)
                .lineLimit(1)

            Text(Money.format(cents: cuenta.balance, currency: cuenta.currency))
                .font(.title3.weight(.semibold))
                .monospacedDigit()
                .foregroundStyle(Theme.amountColor(cuenta.balance))
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
        .padding(Theme.Spacing.m)
        .frame(width: 180, alignment: .leading)
        .background(Theme.Colors.card)
        .clipShape(
            RoundedRectangle(cornerRadius: Theme.Radius.card, style: .continuous)
        )
        .accessibilityElement(children: .combine)
        .accessibilityLabel(
            "\(cuenta.name), \(cuenta.type.nombre), saldo \(Money.format(cents: cuenta.balance, currency: cuenta.currency))"
        )
    }
}

// MARK: - Tarjeta de KPI

struct TarjetaKPI: View {

    let titulo: String
    let subtitulo: String
    let monto: Int
    let moneda: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.xs) {
            Text(titulo)
                .font(.subheadline)
                .foregroundStyle(Theme.Colors.label)

            Text(subtitulo)
                .font(.caption)
                .foregroundStyle(Theme.Colors.tertiaryLabel)

            Text(Money.formatCompact(cents: monto, currency: moneda))
                .font(.title2.weight(.semibold))
                .monospacedDigit()
                .foregroundStyle(color)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
                .padding(.top, Theme.Spacing.xs)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardStyle()
        .accessibilityElement(children: .combine)
        .accessibilityLabel(
            "\(titulo), \(subtitulo): \(Money.format(cents: monto, currency: moneda))"
        )
    }
}
