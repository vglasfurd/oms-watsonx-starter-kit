import { Request, Response, NextFunction } from 'express';
import { Logger } from '@nestjs/common';
import { ApiKeyAuth, ApplicationConfiguration, AuthMethodEnum, BasicAuth, BearerAuth } from '../core/app-configuration';
import { AppConfigService } from '../core/app-config.service';
import { isVoid } from '../common/functions';

const authLogger = new Logger('Authentication');
const appConfig: ApplicationConfiguration = AppConfigService.INSTANCE.getApplicationConfiguration();

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  authLogger.verbose(`Incoming request ${req.path}`);
  if (req.path.startsWith('/api')) {
    authLogger.verbose('Skipping swagger from authentication');
    next();
  } else if (req.path.startsWith('/health')) {
    authLogger.verbose('Skipping health from authentication');
    next();
  } else {
    const { security } = appConfig.skill_provider;
    switch (security.authentication_method) {
      case AuthMethodEnum.basic:
        authenticateWithBasicAuth(security.basic as BasicAuth, req, res, next);
        break;
      case AuthMethodEnum.api_key:
        authenticateWithApiKey(security.api_key as ApiKeyAuth, req, res, next);
        break;
      case AuthMethodEnum.bearer:
        authenticateWithBearerAuth(security.bearer as BearerAuth, req, res, next);
        break;
      case AuthMethodEnum.none:
        next();
        break;
      default:
        unauthenicated(res);
        break;
    }
  }
}

function authenticateWithBearerAuth(bearer: BearerAuth, req: Request, res: Response, next: NextFunction) {
  const { token } = bearer;
  const authHeader = req.header('authorization');
  if (!isVoid(authHeader) && authHeader.startsWith('Bearer ')) {
    const incoming = authHeader.split(' ')[1];
    if (token === incoming) {
      next();
    } else {
      unauthenicated(res);
    }
  } else {
    unauthenicated(res);
  }
}

function authenticateWithApiKey(apiKey: ApiKeyAuth, req: Request, res: Response, next: NextFunction) {
  const _in = apiKey.in;
  const { name, value } = apiKey;
  let reqValue = '';
  switch (_in) {
    case 'cookie':
      reqValue = req.cookies[name];
      break;
    case 'header':
      reqValue = req.header(name);
      break;
    case 'param':
      reqValue = req.query[name] as string;
      break;
  }
  if (reqValue === value) {
    next();
  } else {
    unauthenicated(res);
  }
}

function authenticateWithBasicAuth(basic: BasicAuth, req: Request, res: Response, next: NextFunction) {
  const { username, password } = basic;
  const authHeader = req.header('Authorization');
  if (!isVoid(authHeader) && authHeader.startsWith('Basic ')) {
    try {
      let usernamePassword: string | string[] = authHeader.split(' ')[1];
      usernamePassword = Buffer.from(usernamePassword, 'base64').toString().split(':');
      if (username === usernamePassword[0] && password === usernamePassword[1]) {
        next();
      }
    } catch (err) {
      unauthenicated(res);
    }
  } else {
    unauthenicated(res);
  }
}

function unauthenicated(res: Response) {
  res.status(401);
  res.json({
    err: '_ERR_NOT_AUTHENTICATED',
  });
}
