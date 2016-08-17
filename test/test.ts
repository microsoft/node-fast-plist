/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';

import {parse} from '../src/main';
import * as fs from 'fs';
import * as path from 'path';
import * as assert from 'assert';
import * as sax from 'sax';

const FIXTURES_FOLDER_PATH = path.join(__dirname, '../../test/fixtures');

describe('parse', () => {
    let fixtures = fs.readdirSync(FIXTURES_FOLDER_PATH);

    fixtures.forEach((fixture) => {
        it('should work for ' + fixture, () => {
            let contents = fs.readFileSync(path.join(FIXTURES_FOLDER_PATH, fixture)).toString();

            let expected = parseWithSAX(contents).value;
            let actual = parse(contents);

            assert.deepEqual(actual, expected);
        });
    });
});

describe('parse', () => {

	let header = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
		'<plist version="1.0">'
	];

	let footer = [
		'</plist>'
	];

	function assertParse(lines:string[], expected:any): void {
		let str = header.concat(lines).concat(footer).join('\n');
		let actual = parse(str);
		assert.deepEqual(actual, expected);
	}

	function assertThrows(lines:string[]): void {
		let str = header.concat(lines).concat(footer).join('\n');
		try {
			parse(str);
			assert.ok(false, 'throws');
		} catch(err) {
			assert.ok(true, 'throws');
		}
	}


	it('String', function() {
		assertParse(
			[
				'<string>foo</string>'
			],
			"foo"
		);

		assertParse(
			[
				'<string></string>'
			],
			""
		);

		assertParse(
			[
				'<string>',
				'</string>'
			],
			"\n"
		);

		assertParse(
			[
				'<string>&lt;foo&gt;</string>'
			],
			"<foo>"
		);

	});


	it('Numbers', function() {
		assertParse(
			[
				'<integer>0</integer>'
			],
			0
		);

		assertParse(
			[
				'<real>1.123</real>'
			],
			1.123
		);

		assertThrows(
			[
				'<integer>ab</integer>'
			]
		);
	});


	it('Booleans', function() {
		assertParse(
			[
				'<true />'
			],
			true
		);

		assertParse(
			[
				'<false />'
			],
			false
		);

		assertParse(
			[
				'<false></false>'
			],
			false
		);
	});


	it('Dictionaries', function() {

		// empty
		assertParse(
			[
				'<dict>',
				'</dict>'
			],
			{}
		);

		// keys and nesting
		assertParse(
			[
				'<dict>',
					'<key>name</key>',
					'<string>Variable</string>',
					'<key>scope</key>',
					'<string>variable</string>',
					'<key>settings</key>',
					'<dict>',
						'<key>fontStyle</key>',
						'<string></string>',
					'</dict>',
				'</dict>'
			],
			{
				name: "Variable",
				scope: "variable",
				settings: {
					fontStyle: ""
				}
			}
		);
	});


	it('Arrays', function() {

		// empty
		assertParse(
			[
				'<array>',
				'</array>'
			],
			[]
		);

		// multiple elements
		assertParse(
			[
				'<array>',
					'<string>1</string>',
					'<string>2</string>',
				'</array>'
			],
			[ "1", "2" ]
		);

		// nesting
		assertParse(
			[
				'<array>',
					'<array>',
						'<integer>1</integer>',
						'<integer>2</integer>',
					'</array>',
					'<array>',
						'<true />',
					'</array>',
				'</array>'
			],
			[ [ 1, 2 ], [ true ]]
		);
	});
});

/**
 * Parse a PLIST file using `sax`.
 */
function parseWithSAX(content: string): { value: any; errors: string[]; } {

    interface PListObject {
        parent: PListObject;
        value: any;
        lastKey?: string;
    }

	let errors : string[] = [];
	let currObject : PListObject = null;
	let result : any = null;

	let text: string = null;

    let parser = sax.parser(false, { lowercase: true });
	parser.onerror = (e:any) => {
		errors.push(e.message);
	};
	parser.ontext = (s: string) => {
		text = s;
	};
	parser.onopentag = (tag: sax.Tag) => {
		switch (tag.name) {
			case 'dict':
				currObject = { parent: currObject, value: {} };
				break;
			case 'array':
				currObject = { parent: currObject, value: [] };
				break;
			case 'key':
				if (currObject) {
					currObject.lastKey = null;
				}
				break;
		}
		text = '';
	}

	parser.onclosetag = (tagName:  string) => {
		let value: any;
		switch (tagName) {
			case 'key':
				if (!currObject || Array.isArray(currObject.value)) {
					errors.push('key can only be used inside an open dict element');
					return;
				}
				currObject.lastKey = text;
				return;
			case 'dict':
			case 'array':
				if (!currObject) {
					errors.push(tagName + ' closing tag found, without opening tag');
					return;
				}
				value = currObject.value;
				currObject = currObject.parent;
				break;
			case 'string':
			case 'data':
				value = text;
				break;
			case 'date':
				value = new Date(text);
				break;
			case 'integer':
				value = parseInt(text);
				if (isNaN(value)) {
					errors.push(text + ' is not a integer');
					return;
				}
				break;
			case 'real':
				value = parseFloat(text);
				if (isNaN(value)) {
					errors.push(text + ' is not a float');
					return;
				}
				break;
			case 'true':
				value = true;
				break;
			case 'false':
				value = false;
				break;
			case 'plist':
				return;
			default:
				errors.push('Invalid tag name: ' + tagName);
				return;

		}
		if (!currObject) {
			result = value;
		} else if (Array.isArray(currObject.value)) {
			currObject.value.push(value);
		} else {
			if (currObject.lastKey) {
				currObject.value[currObject.lastKey] = value;
			} else {
				errors.push('Dictionary key missing for value ' + value);
			}
		}
	};
	parser.write(content);

    return { errors: errors, value: result };
}
