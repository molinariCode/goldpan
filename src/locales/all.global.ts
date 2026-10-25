import all from './all';
import { registerGlobal } from './register-global';

for (const [code, messages] of Object.entries(all)) registerGlobal(code, messages);
