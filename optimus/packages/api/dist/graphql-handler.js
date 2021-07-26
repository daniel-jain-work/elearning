"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apolloHandler = exports.GraphqlContext = void 0;
const Sentry = require("@sentry/node");
const apollo_server_lambda_1 = require("apollo-server-lambda");
const cl_common_1 = require("cl-common");
const fs = require("fs");
const lodash_1 = require("lodash");
const path = require("path");
const sequelize_1 = require("sequelize");
const logger_1 = require("./lib/logger");
const token_store_1 = require("./lib/token-store");
const resolvers_1 = require("./resolvers");
const typeDefs = fs.readFileSync(path.join(__dirname, '..', 'api-typedefs.graphql'), 'utf8');
const INTERNAL_SERVICE = 'appboy';
class GraphqlContext {
    constructor(token, requestId) {
        this.isAdmin = false;
        this.isInternal = false;
        this.token = token;
        if (token === INTERNAL_SERVICE) {
            this.isAdmin = true;
            this.isInternal = true;
            this.identity = INTERNAL_SERVICE;
        }
        else if (token) {
            try {
                const params = token_store_1.decodeToken(token);
                this.userId = params.userId;
                this.identity = params.email;
                this.teacherId = params.teacherId;
                this.isAdmin = params.isAdmin;
                this.isInternal = params.isOps || params.isAdmin;
            }
            catch (err) {
                logger_1.default.error(err, '%s is not a valid token', token);
            }
        }
        this.logger = logger_1.default.child({
            identity: this.identity,
            requestId
        });
    }
    updateUser(user) {
        this.token = token_store_1.createToken(user);
    }
    unauthorized(message) {
        const error = new apollo_server_lambda_1.AuthenticationError(message);
        Object.assign(error.extensions, {
            isAuthenticated: Boolean(this.userId),
            isAdmin: this.isAdmin
        });
        throw error;
    }
    badRequest(message, props = {}) {
        throw new apollo_server_lambda_1.UserInputError(message, props);
    }
    adminOnly() {
        if (!this.isAdmin) {
            this.unauthorized('Require admin user');
        }
    }
    internalOnly() {
        if (!this.isInternal) {
            this.unauthorized('Require internal user');
        }
    }
    onwerOrAdmin(id) {
        if (this.isAdmin || id === this.teacherId || id === this.userId)
            return;
        this.unauthorized('Require admin or owner');
    }
    ownerOrInternal(id) {
        if (this.isInternal || id === this.teacherId || id === this.userId)
            return;
        this.unauthorized('Require internal or owner');
    }
}
exports.GraphqlContext = GraphqlContext;
function formatError(err) {
    let report = true;
    let extensions = lodash_1.omit(err.extensions, 'exception');
    if (err.originalError instanceof sequelize_1.ValidationError) {
        report = false;
        extensions = err.originalError.errors.reduce((all, item) => Object.assign(all, {
            [item.path]: item.message
        }), {});
    }
    if (err.originalError instanceof apollo_server_lambda_1.UserInputError ||
        err.originalError instanceof apollo_server_lambda_1.AuthenticationError) {
        logger_1.default.warn(err.originalError);
        report = false;
    }
    if (report) {
        logger_1.default.error(err, err.message);
        Sentry.withScope(scope => {
            scope.setTag('service', 'Graphql API');
            scope.setExtras(extensions);
            Sentry.captureException(err);
        });
    }
    err.extensions = extensions;
    return err;
}
const authExtention = new apollo_server_lambda_1.GraphQLExtension();
authExtention.willSendResponse = opts => {
    if (opts.context.token) {
        opts.graphqlResponse.http.headers.set(cl_common_1.headerNames.apiToken, opts.context.token);
    }
    return opts;
};
const apolloServer = new apollo_server_lambda_1.ApolloServer({
    typeDefs,
    resolvers: resolvers_1.default,
    formatError,
    playground: true,
    introspection: true,
    extensions: [() => authExtention],
    context({ event }) {
        var _a;
        return new GraphqlContext(event.headers[cl_common_1.headerNames.apiToken], ((_a = event.requestContext) === null || _a === void 0 ? void 0 : _a.requestId) || event.headers['X-Amz-Cf-Id']);
    }
});
exports.apolloHandler = apolloServer.createHandler();
