"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cl_models_1 = require("cl-models");
exports.default = {
    attribution(er) {
        return `${er.source} ${er.campaign}`.trim();
    },
    async student(er) {
        return er.student || er.getStudent();
    },
    async attendances(er) {
        return cl_models_1.AttendanceModel.findAll({
            where: {
                studentId: er.studentId
            },
            include: [
                {
                    model: cl_models_1.SessionModel,
                    where: {
                        classId: er.classId
                    },
                    required: true
                }
            ]
        });
    },
    async promotion(er) {
        return er.promotion || er.getPromotion();
    },
    async class(er) {
        return (er.class ||
            er.getClass({
                include: [cl_models_1.TeacherModel]
            }));
    },
    async paymentInfo(er) {
        const lineItems = [];
        const transactions = er.transactions || (await er.getTransactions());
        for (const tr of transactions) {
            if (tr.amount > 0) {
                lineItems.push(`💹${tr.amount}`);
            }
            else {
                lineItems.push(`📉${tr.amount}`);
            }
        }
        if (er.creditId) {
            const credit = er.credit || (await er.getCredit());
            lineItems.push(`💰${credit.cents / 100}`);
        }
        return lineItems.join(', ');
    },
    async transactionId(er) {
        const transactions = er.transactions || (await er.getTransactions());
        const salesTransaction = transactions.find(t => t.type === cl_models_1.TransactionOperation.Sale);
        return salesTransaction ? salesTransaction.id : null;
    }
};
