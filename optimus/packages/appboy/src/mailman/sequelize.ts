import { initModels } from 'cl-models';
import * as config from 'config';
export default initModels(config.get('rds'));
