export type DomainErrorCode =
  | 'DUPLICATE_TRADE_ID'
  | 'UNKNOWN_SYMBOL'
  | 'INSUFFICIENT_POSITION';

export class DomainError extends Error {
  code: DomainErrorCode;
  status: number;

  constructor(code: DomainErrorCode, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

