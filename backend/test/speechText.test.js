import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeForSpeech } from '../src/utils/speechText.js';

describe('sanitizeForSpeech', () => {
  it('removes asterisk stage directions', () => {
    const input = '*glances at the phone* Hello, is this about the school test?';
    assert.equal(sanitizeForSpeech(input), 'Hello, is this about the school test?');
  });

  it('removes multi-clause stage blocks', () => {
    const input =
      '*Leans back slightly, eyes narrowing* Wait, so you are saying my child was selected?';
    assert.equal(
      sanitizeForSpeech(input),
      'Wait, so you are saying my child was selected?'
    );
  });

  it('removes parenthetical directions', () => {
    const input = '(sighs) The fee sounds very high to us.';
    assert.equal(sanitizeForSpeech(input), 'The fee sounds very high to us.');
  });
});
