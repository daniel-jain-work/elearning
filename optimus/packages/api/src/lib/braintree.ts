import { BraintreeGateway, Environment } from 'braintree';
import * as config from 'config';
import { Logger } from 'pino';

const gateway = new BraintreeGateway({
  environment: Environment[config.get('braintree.environment')],
  merchantId: config.get('braintree.merchantId'),
  publicKey: config.get('braintree.publicKey'),
  privateKey: config.get('braintree.privateKey')
});

const errorMessages = {
  authenticationError: 'Cannot Authenticate with payment processor',
  authorizationError: 'Cannot Authenticate with payment processor',
  downForMaintenanceError:
    'Payment processor is down for maintenance, please try again later',
  invalidSignatureError: 'Cannot Authenticate with payment processor',
  invalidChallengeError: 'Cannot Authenticate with payment processor',
  invalidTransparentRedirectHashError: 'Cannot Authenticate with payment processor',
  notFoundError: 'Transaction cannot be found',
  serverError: 'Server Error',
  testOperationPerformedInProductionError:
    'Payment processor: Test operation performed in production',
  tooManyRequestsError: 'Payment processor: Too many requests sent'
};

export async function refund(
  transactionId: string,
  logger: Logger,
  amount?: number
) {
  try {
    const result = await gateway.transaction.refund(
      transactionId,
      amount?.toFixed(2)
    );

    if (result.success && result.transaction) {
      logger.info('refund succeeded');
      return result.transaction;
    }

    logger.warn(result, 'refund failed');
    throw new Error(
      result.transaction?.processorSettlementResponseText || result.message
    );
  } catch (e) {
    const message = errorMessages[e.type] || e.message;
    logger.error(e, 'refund failed');
    throw new Error(message);
  }
}
