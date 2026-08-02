import SwiftUI

struct LoginView: View {

    @Environment(SesionStore.self) private var sesion

    @State private var modo: Modo = .iniciarSesion
    @State private var email = ""
    @State private var nombre = ""
    @State private var password = ""
    @State private var enProceso = false
    @State private var mensajeError: String?

    @FocusState private var campoActivo: Campo?

    private enum Modo {
        case iniciarSesion
        case registrarse

        var titulo: String {
            self == .iniciarSesion ? "Iniciar sesión" : "Crear cuenta"
        }

        var alternativa: String {
            self == .iniciarSesion
                ? "¿No tienes cuenta? Crear una"
                : "¿Ya tienes cuenta? Iniciar sesión"
        }
    }

    private enum Campo: Hashable {
        case nombre, email, password
    }

    private var formularioValido: Bool {
        let credencialesOK = email.contains("@") && password.count >= 8
        return modo == .iniciarSesion
            ? credencialesOK
            : credencialesOK && nombre.trimmingCharacters(in: .whitespaces).count >= 2
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Theme.Spacing.l) {
                    encabezado
                    formulario

                    if let mensajeError {
                        Text(mensajeError)
                            .font(.footnote)
                            .foregroundStyle(Theme.Status.critical)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .accessibilityAddTraits(.isStaticText)
                    }

                    acciones
                }
                .padding(Theme.Spacing.m)
            }
            .background(Theme.Colors.groupedBackground)
            .navigationTitle(modo.titulo)
            .navigationBarTitleDisplayMode(.large)
            .scrollDismissesKeyboard(.interactively)
        }
    }

    private var encabezado: some View {
        VStack(spacing: Theme.Spacing.s) {
            Image(systemName: "chart.pie.fill")
                .font(.system(size: 48))
                .foregroundStyle(Color.accentColor)
                .accessibilityHidden(true)

            Text("Controla tus gastos sin anotarlos uno por uno.")
                .font(.subheadline)
                .foregroundStyle(Theme.Colors.secondaryLabel)
                .multilineTextAlignment(.center)
        }
        .padding(.top, Theme.Spacing.l)
    }

    private var formulario: some View {
        VStack(spacing: Theme.Spacing.m) {
            if modo == .registrarse {
                campo("Nombre") {
                    TextField("Tu nombre", text: $nombre)
                        .textContentType(.name)
                        .focused($campoActivo, equals: .nombre)
                }
            }

            campo("Correo") {
                TextField("tucorreo@ejemplo.com", text: $email)
                    .textContentType(.emailAddress)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .focused($campoActivo, equals: .email)
            }

            campo("Contraseña") {
                SecureField("Mínimo 8 caracteres", text: $password)
                    .textContentType(
                        modo == .iniciarSesion ? .password : .newPassword
                    )
                    .focused($campoActivo, equals: .password)
            }
        }
    }

    private func campo<Contenido: View>(
        _ etiqueta: String,
        @ViewBuilder contenido: () -> Contenido
    ) -> some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.xs) {
            Text(etiqueta)
                .font(.footnote)
                .foregroundStyle(Theme.Colors.secondaryLabel)

            contenido()
                .padding(Theme.Spacing.m)
                .background(Theme.Colors.card)
                .clipShape(
                    RoundedRectangle(
                        cornerRadius: Theme.Radius.small, style: .continuous
                    )
                )
        }
    }

    private var acciones: some View {
        VStack(spacing: Theme.Spacing.m) {
            Button {
                Task { await enviar() }
            } label: {
                if enProceso {
                    ProgressView()
                        .frame(maxWidth: .infinity)
                } else {
                    Text(modo.titulo)
                        .frame(maxWidth: .infinity)
                }
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .disabled(!formularioValido || enProceso)

            Button(modo.alternativa) {
                withAnimation(.snappy) {
                    modo = modo == .iniciarSesion ? .registrarse : .iniciarSesion
                    mensajeError = nil
                }
            }
            .font(.subheadline)
        }
    }

    private func enviar() async {
        campoActivo = nil
        enProceso = true
        mensajeError = nil

        do {
            let correo = email.trimmingCharacters(in: .whitespaces)

            switch modo {
            case .iniciarSesion:
                try await sesion.iniciarSesion(email: correo, password: password)
            case .registrarse:
                try await sesion.registrarse(
                    email: correo,
                    nombre: nombre.trimmingCharacters(in: .whitespaces),
                    password: password
                )
            }
        } catch {
            mensajeError = error.localizedDescription
        }

        enProceso = false
    }
}
