import { siteLogoUrl, TransactionOperation, tzOpts } from 'cl-common';
import {
  ClassModel,
  CourseModel,
  EnrollmentModel,
  StudentModel,
  TransactionModel
} from 'cl-models';
import { NextFunction, Request, Response } from 'express';
import { template } from 'lodash';
import { DateTime } from 'luxon';
import { siteUrl } from './url-utils';

const htmlTpl = template(`
<!DOCTYPE html>
<html style="max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, 0.15); font-size: 16px; line-height: 24px; font-family: 'Helvetica Neue', 'Helvetica', Helvetica, Arial, sans-serif; color: #555;">
  <body>
    <table cellpadding="0" cellspacing="0" style="width: 100%; line-height: inherit; text-align: left;" width="100%" align="left">
      <tr class="top">
        <td colspan="2" style="padding: 5px; vertical-align: top;" valign="top">
          <table style="width: 100%; line-height: inherit; text-align: left;" width="100%" align="left">
            <tr>
              <td class="title" style="padding: 5px; vertical-align: top; padding-bottom: 20px; font-size: 45px; line-height: 45px; color: #333;" valign="top">
                <img src="${siteLogoUrl}" style="width:100%; max-width:150px;">
              </td>

              <td style="padding: 5px; vertical-align: top; text-align: right; padding-bottom: 20px;" valign="top" align="right">
                Invoice #: <%=invoiceId%><br>
                Created: <%=invoiceTime%>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <tr class="information">
        <td colspan="2" style="padding: 5px; vertical-align: top;" valign="top">
          <table style="width: 100%; line-height: inherit; text-align: left;" width="100%" align="left">
            <tr>
              <td style="padding: 5px; vertical-align: top; padding-bottom: 40px;" valign="top">
                Create & Learn, Inc.<br/>
                <% if(ein) { %> EIN: <u>82-2919937</u><br/><% } %>
                <u>${siteUrl.main}</u>
              </td>

              <td style="padding: 5px; vertical-align: top; text-align: right; padding-bottom: 40px;" valign="top" align="right">
                <%=userName%><br>
                <%=userEmail%>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <tr class="heading">
        <td style="padding: 5px; vertical-align: top; background: #eee; border-bottom: 1px solid #ddd; font-weight: bold;" valign="top">
          Payment Method
        </td>
        <td style="padding: 5px; vertical-align: top; text-align: right; background: #eee; border-bottom: 1px solid #ddd; font-weight: bold;" valign="top" align="right">
          <img src="<%=paymentIcon%>" style="height: 24px; width: auto; vertical-align: bottom;">
        </td>
      </tr>

      <tr class="details">
        <td style="padding: 5px; vertical-align: top; padding-bottom: 20px;" valign="top">
          Registration and fees paid in full with <%=paymentType%>
        </td>

        <td style="padding: 5px; vertical-align: top; text-align: right; padding-bottom: 20px;" valign="top" align="right">
          <%=paymentId%>
        </td>
      </tr>

      <tr class="heading">
        <td style="padding: 5px; vertical-align: top; background: #eee; border-bottom: 1px solid #ddd; font-weight: bold;" valign="top" colSpan="2">
          Student Name
        </td>
      </tr>

      <tr class="details">
        <td style="padding: 5px; vertical-align: top; padding-bottom: 20px;" valign="top" colSpan="2">
          <%=studentName%>
        </td>
      </tr>

      <tr class="heading">
        <td style="padding: 5px; vertical-align: top; background: #eee; border-bottom: 1px solid #ddd; font-weight: bold;" valign="top" colSpan="2">
          Class Registrations
        </td>
      </tr>

      <% items.forEach(item => { %>
      <tr class="item">
        <td colspan="2" style="padding: 5px; vertical-align: top; border-bottom: 1px solid #eee;" valign="top">
          <%=item%>
        </td>
      </tr>
      <% }) %>
      <tr class="total">
        <td style="padding: 5px; vertical-align: top;" valign="top"></td>
        <td style="padding: 5px; vertical-align: top; text-align: right; font-weight: bold;" valign="top" align="right">
          Total: <%=amountPaid%>
        </td>
      </tr>
    </table>
  </body>
</html>
`);

export const invoicePath = '/invoice/:id';

export async function invoiceHandler(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const enrollment = await EnrollmentModel.findByPk(req.params.id, {
      rejectOnEmpty: true,
      include: [
        { model: StudentModel, required: true },
        {
          model: TransactionModel,
          where: {
            'details.type': TransactionOperation.Sale
          }
        }
      ]
    });

    const invoice = await createInvoice(
      enrollment.student,
      enrollment.transactions[0],
      true
    );

    res.send(invoice);
  } catch (err) {
    next(err);
  }
}

export async function createInvoice(
  student: StudentModel,
  transaction: TransactionModel,
  ein = false
) {
  const records = await transaction.getEnrollments({
    include: [
      {
        model: ClassModel,
        include: [CourseModel]
      }
    ]
  });

  let paymentType = 'Offline Payment';
  let paymentIcon =
    'https://assets.braintreegateway.com/payment_method_logo/unknown.png';
  let paymentId = transaction.id;
  if (transaction.details.creditCard) {
    paymentType = transaction.details.creditCard.cardType;
    paymentIcon = transaction.details.creditCard.imageUrl;
    paymentId = transaction.details.creditCard.last4;
  } else if (transaction.details.paypal) {
    paymentType = 'PayPal';
    paymentIcon = transaction.details.paypal.imageUrl;
    paymentId = transaction.details.paypal.payerId;
  }

  return htmlTpl({
    paymentType,
    paymentIcon,
    paymentId,
    studentName: student.name,
    userName: student.parent.fullName,
    userEmail: student.parent.email,
    items: records.map(record => record.class.course.name),
    invoiceId: transaction.details.id,
    invoiceTime: DateTime.fromJSDate(transaction.createdAt, tzOpts).toFormat('ff'),
    amountPaid: '$' + transaction.amount,
    ein
  });
}
