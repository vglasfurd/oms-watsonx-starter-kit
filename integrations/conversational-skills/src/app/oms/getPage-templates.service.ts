import { Injectable, OnModuleInit } from '@nestjs/common';
import { getAssetsDirectory } from '../common/functions';
import { parse, resolve } from 'path';
import { get } from 'lodash';
import { readdir } from 'fs/promises';
import { Dirent } from 'fs';

/**
 * This service retrieves output templates for `GetPage` API.
 * The templates are read from the `assets/oms/api-templates` directory.
 * Each file in the directory represents a scenario and each scenario can
 * have multiple templates associated with it. Each template has a name and
 * the skill leverages a template by it's scenario name and template name.
 */
@Injectable()
export class GetPageTemplatesService implements OnModuleInit {
  private readonly pageTemplates: Record<string, any> = {};

  async onModuleInit() {
    const basePath = resolve(getAssetsDirectory(), './oms/api-templates');
    const dirents: Dirent[] = await readdir(basePath, { withFileTypes: true });
    const tpls: any[] = await Promise.all(dirents.map((d) => import(resolve(basePath, d.name))));
    dirents.forEach((d, idx) => (this.pageTemplates[parse(d.name).name] = tpls[idx]));
  }

  /**
   * This method returns the API output template based on the scenario and template path specified.
   * @param scenario The name of the scenario. This represents a file name in the `assets/oms/api-templates`directory.
   * @param templatePath The name of the template to fetch. This can also be a json path.
   * @returns The API output template as JSON
   */
  public getPageTemplate(scenario: string, templatePath: string = 'default') {
    const template = this.pageTemplates[scenario];
    return get(template, templatePath, get(template, 'default', {}));
  }
}
