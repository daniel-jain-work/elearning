"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInvoice = void 0;
const assert = require("assert");
const cl_common_1 = require("cl-common");
const cl_models_1 = require("cl-models");
const lodash_1 = require("lodash");
const luxon_1 = require("luxon");
const htmlTpl = lodash_1.template(`
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
    @media only screen and (max-width: 600px) {
      .invoice-box table tr.top table td {
        width: 100%;
        display: block;
        text-align: center;
      }
    }
    </style>
  </head>
  <body>
    <div class="invoice-box" style="max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, 0.15); font-size: 16px; line-height: 24px; font-family: 'Helvetica Neue', 'Helvetica', Helvetica, Arial, sans-serif; color: #555;">
      <table cellpadding="0" cellspacing="0" style="width: 100%; line-height: inherit; text-align: left;" width="100%" align="left">
        <tr class="top">
          <td colspan="2" style="padding: 5px; vertical-align: top;" valign="top">
            <table style="width: 100%; line-height: inherit; text-align: left;" width="100%" align="left">
              <tr>
                <td class="title" style="padding: 5px; vertical-align: top; padding-bottom: 20px; font-size: 45px; line-height: 45px; color: #333;" valign="top">
                  <img src="${cl_common_1.siteLogoUrl}" style="width:100%; max-width:150px;">
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
                  Create & Learn, Inc.<br>
                  Los Altos, CA 94022
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
            <%=paymentType%>
          </td>

          <td style="padding: 5px; vertical-align: top; text-align: right; padding-bottom: 20px;" valign="top" align="right">
            <%=paymentId%>
          </td>
        </tr>

        <tr class="heading">
          <td style="padding: 5px; vertical-align: top; background: #eee; border-bottom: 1px solid #ddd; font-weight: bold;" valign="top">
            Item
          </td>

          <td style="padding: 5px; vertical-align: top; text-align: right; background: #eee; border-bottom: 1px solid #ddd; font-weight: bold;" valign="top" align="right">
            Price
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
          <td style="padding: 5px; vertical-align: top; text-align: right; border-top: 2px solid #eee; font-weight: bold;" valign="top" align="right">Total: <%=amountPaid%></td>
        </tr>
      </table>
    </div>
  </body>
</html>
`);
async function createInvoice(student, transaction) {
    assert.equal(transaction.type, cl_models_1.TransactionOperation.Sale, 'Not a valid transaction');
    const records = await transaction.getEnrollments({
        include: [
            {
                model: cl_models_1.ClassModel,
                include: [cl_models_1.CourseModel]
            }
        ]
    });
    let paymentType = lodash_1.get(transaction, 'details.creditCard.cardType');
    let paymentIcon = lodash_1.get(transaction, 'details.creditCard.imageUrl');
    let paymentId = lodash_1.get(transaction, 'details.creditCard.last4');
    if (transaction.details.paypal) {
        paymentType = 'PayPal';
        paymentIcon = lodash_1.get(transaction, 'details.paypal.imageUrl');
        paymentId = lodash_1.get(transaction, 'details.paypal.payerId');
    }
    return htmlTpl({
        paymentType,
        paymentIcon,
        paymentId,
        userName: student.parent.fullName,
        userEmail: student.parent.email,
        items: records.map(record => record.class.course.name),
        invoiceId: transaction.details.id,
        invoiceTime: luxon_1.DateTime.fromJSDate(transaction.createdAt, cl_common_1.tzOpts).toFormat('ff'),
        amountPaid: '$' + transaction.details.amount
    });
}
exports.createInvoice = createInvoice;
