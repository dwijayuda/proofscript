export class KernelError extends Error {
  readonly code: string;
  constructor(message: string, code = "kernel_error") {
    super(message);
    this.name = "KernelError";
    this.code = code;
  }
}

export class KernelUnsupportedError extends KernelError {
  constructor(message: string) {
    super(message, "kernel_unsupported");
    this.name = "KernelUnsupportedError";
  }
}

export class KernelResourceError extends KernelError {
  constructor(message: string, code = "kernel_resource_limit") {
    super(message, code);
    this.name = "KernelResourceError";
  }
}

export class KernelTypeError extends KernelError {
  constructor(message: string) {
    super(message, "kernel_type_error");
    this.name = "KernelTypeError";
  }
}

export class KernelDeclarationError extends KernelError {
  constructor(message: string) {
    super(message, "kernel_declaration_error");
    this.name = "KernelDeclarationError";
  }
}
