import { parse } from '../src/main';
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

describe('CDATA parsing', () => {
    it('should parse CDATA inside <string>', () => {
        const file = path.join(__dirname, 'cdata-string.plist');
        const contents = fs.readFileSync(file, 'utf8');
        const result = parse(contents);
        assert.deepStrictEqual(result, { snippet: "console.log('foo <bar>');" });
    });
});
