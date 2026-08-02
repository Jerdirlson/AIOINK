import Foundation

/// Formateo de dinero. Los montos viajan y se guardan como enteros en
/// centavos (ver `docs/04-modelo-datos.md`); aquí es el único punto donde se
/// convierten a texto.
enum Money {

    /// El peso colombiano no se usa con centavos en la práctica, así que se
    /// muestra sin decimales aunque su unidad menor sea el centavo.
    private static let sinDecimales: Set<String> = ["COP", "CLP", "JPY", "KRW"]

    private static func decimales(para moneda: String) -> Int {
        sinDecimales.contains(moneda.uppercased()) ? 0 : 2
    }

    /// - Parameters:
    ///   - cents: monto en centavos, con signo.
    ///   - currency: código ISO 4217.
    ///   - signo: `.automatic` muestra el − de los gastos; `.absolute` lo
    ///     omite, útil cuando el contexto ya indica que es un gasto.
    static func format(
        cents: Int,
        currency: String = "COP",
        signo: Signo = .automatic
    ) -> String {
        let valor = Decimal(signo == .absolute ? abs(cents) : cents) / 100

        return valor.formatted(
            .currency(code: currency)
                .precision(.fractionLength(decimales(para: currency)))
        )
    }

    /// Versión compacta para titulares donde no cabe la cifra completa
    /// (p. ej. "$9,59 M"). Solo para montos grandes: por debajo de un millón
    /// devuelve el formato normal, que ya es corto.
    static func formatCompact(cents: Int, currency: String = "COP") -> String {
        let pesos = abs(cents) / 100
        guard pesos >= 1_000_000 else {
            return format(cents: cents, currency: currency)
        }

        let millones = Decimal(pesos) / 1_000_000
        let numero = millones.formatted(.number.precision(.fractionLength(0...2)))
        let signo = cents < 0 ? "-" : ""

        return "\(signo)$\(numero) M"
    }

    enum Signo {
        case automatic
        case absolute
    }
}

/// Fechas orientadas a la lectura: "Hoy" y "Ayer" en vez de la fecha completa,
/// que es como las agrupa la pantalla de transacciones.
enum FechaTexto {

    private static let formateadorLargo: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "es_CO")
        f.setLocalizedDateFormatFromTemplate("d MMM yyyy")
        return f
    }()

    /// Encabezado de un grupo de transacciones.
    static func encabezado(_ fecha: Date, ahora: Date = Date()) -> String {
        let cal = Calendar.current

        if cal.isDateInToday(fecha) { return "Hoy" }
        if cal.isDateInYesterday(fecha) { return "Ayer" }

        return formateadorLargo.string(from: fecha)
    }

    /// Clave estable para agrupar por día, independiente de la hora.
    static func inicioDelDia(_ fecha: Date) -> Date {
        Calendar.current.startOfDay(for: fecha)
    }

    /// Nombre del mes a partir de "2026-07", como lo devuelve el reporte
    /// mensual de la API.
    static func mesCorto(desdeClave clave: String) -> String {
        let partes = clave.split(separator: "-")
        guard partes.count == 2,
              let anio = Int(partes[0]),
              let mes = Int(partes[1]),
              let fecha = Calendar.current.date(
                from: DateComponents(year: anio, month: mes, day: 1)
              )
        else { return clave }

        let f = DateFormatter()
        f.locale = Locale(identifier: "es_CO")
        f.setLocalizedDateFormatFromTemplate("MMM")
        return f.string(from: fecha)
    }
}
