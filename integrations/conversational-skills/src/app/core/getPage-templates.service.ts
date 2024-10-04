import { Injectable, OnModuleInit } from '@nestjs/common';
import { getAssetsDirectory } from '../common/functions';
import { parse, resolve } from 'path';
import { get } from 'lodash';
import { readdir } from 'fs/promises';
import { Dirent } from 'fs';

@Injectable()
export class GetPageTemplatesService implements OnModuleInit {
  private readonly pageTemplates: Record<string, any> = {};

  async onModuleInit() {
    const basePath = resolve(getAssetsDirectory(), './oms/api-templates');
    const dirents: Dirent[] = await readdir(basePath, { withFileTypes: true });
    const tpls: any[] = await Promise.all(dirents.map((d) => import(resolve(basePath, d.name))));
    dirents.forEach((d, idx) => (this.pageTemplates[parse(d.name).name] = tpls[idx]));
  }

  public getPageTemplate(scenario: string, templatePath: string = 'default') {
    const template = this.pageTemplates[scenario];
    return get(template, templatePath, get(template, 'default', {}));
  }
}
