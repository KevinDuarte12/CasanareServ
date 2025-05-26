export interface Transaction {
  id_transaction?: number;
  id_cart?: number;
  id_user?: number;
  total_amount: number;
  status?: 'pendiente' | 'completada' | 'fallida' | 'reembolsada';
  reference_payu?: string;
  payment_method?: string;
  transaction_date?: Date;
}

export interface PayuResponse {
  code?: string;
  error?: string;
  transactionResponse?: {
    orderId?: string;
    transactionId?: string;
    state?: string;
    responseCode?: string;
    responseMessage?: string;
    operationDate?: Date;
    extraParameters?: {
      URL_PAYMENT_REDIRECT?: string;
      BANK_URL?: string;
    };
  };
}