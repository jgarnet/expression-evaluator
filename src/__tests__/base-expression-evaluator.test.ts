import BaseExpressionEvaluator from "../base-expression-evaluator";
import {describe, expect, it} from "@jest/globals";
import ExpressionContext from "../types/expression-context";
import operators from "../operators/operators";
import functions from "../functions/functions";

const testAssertion = (expression: string, object: any, outcome: boolean) => {
    const evaluator = new BaseExpressionEvaluator();
    expect(evaluator.evaluate({ expression, object })).toEqual(outcome);
};

const testError = (expression: string, expectedError: Error) => {
    const evaluator = new BaseExpressionEvaluator();
    expect(() => evaluator.evaluate({ expression, object: { A: 2, B: 3 } })).toThrowError(expectedError);
};

describe('BaseExpressionEvaluator Tests', () => {
    it('should evaluate simple expressions', () => {
        testAssertion('field = 5', { field: 5 }, true);
        testAssertion('(field = 5)', { field: 5 }, true);
        testAssertion('(((field = 5)))', { field: 5 }, true);
        testAssertion('field = 6', { field: 5 }, false);
        testAssertion('NOT field = 6', { field: 5 }, true);
    });
    it('should evaluate simple expressions with operators', () => {
        testAssertion('field = 5 AND field > 4', { field: 5 }, true);
        testAssertion('field = 5 AND field > 4', { field: 5 }, true);
        testAssertion('field = 6 OR field > 3', { field: 5 }, true);
        testAssertion('field = 6 OR field < 2', { field: 5 }, false);
        testAssertion('field = 6 OR NOT field < 2', { field: 5 }, true);
        testAssertion('field > 4 AND fieldB < 20', { field: 5, fieldB: 10 }, true);
        testAssertion('field > 4 AND fieldB IN TST,TST1,TST2', { field: 5, fieldB: 'TST' }, true);
        testAssertion('field > 4 AND fieldB IN TST,TST1,TST2', { field: 5, fieldB: 'TST' }, true);
    });
    it('should evaluate child expressions', () => {
        testAssertion(
            'firstName = John AND (lastName = Smith OR age > 20) AND (profession = IT)',
            { firstName: 'John', lastName: 'Doe', age: 23, profession: 'IT', yearsOfExperience: 2 },
            true
        );
        testAssertion(
            'firstName = John AND (lastName = Smith OR age > 20) AND profession = IT',
            { firstName: 'John', lastName: 'Doe', age: 23, profession: 'IT', yearsOfExperience: 2 },
            true
        );
        testAssertion(
            '(firstName = "John" AND (lastName = Smith OR age > 20) AND profession = IT) OR (firstName = Jane AND ((NOT profession = Finance) OR profession = Finance AND yearsOfExperience > 3))',
            { firstName: 'Jane', lastName: 'Doe', age: 25, profession: 'Finance', yearsOfExperience: 5 },
            true
        );
        testAssertion(
            '((status = Delivered AND type = Online) OR (status = "Picked Up" AND type = "In Store")) AND cost > 25',
            { status: 'Delivered', type: 'Online', cost: 50, deliveryType: 'ship', deliveryFee: 5 },
            true
        );
        testAssertion(
            '((status = Delivered AND type = Online) OR (status = "Picked Up" AND type = "In Store")) AND cost > 25',
            { status: 'Ordered', type: 'Online', cost: 50, deliveryType: 'ship', deliveryFee: 5 },
            false
        );
        testAssertion(
            '((status = Delivered AND type = Online) OR (status = "Picked Up" AND type = "In Store")) AND (cost > 25)',
            { status: 'Picked Up', type: 'In Store', cost: 50, deliveryType: 'ship', deliveryFee: 5 },
            true
        );
        testAssertion(
            '(a = 1 AND b = 2) AND NOT (c > 5) AND (c < 1 OR d > 2)',
            { a: 1, b: 2, c: 3, d: 4 },
            true
        );
        testAssertion(
            '(a = 1 AND b = 2) AND NOT ((c > 5)) AND (((c < 1 OR d > 2)))',
            { a: 1, b: 2, c: 3, d: 4 },
            true
        );
    });
    it('should account for quotes and whitespace', () => {
        testAssertion(`
            a = 1
        `, { a: 1 }, true);
        testAssertion(`
            a = "testing\nmultiple\nlines"
        `, { a: 'testing\nmultiple\nlines' }, true);
        testAssertion(`
            a = testing\nmultiple\nlines
        `, { a: 'testing\nmultiple\nlines' }, false);
        testAssertion('a = "Testing \\"nested\\" quotes"', { a: 'Testing "nested" quotes'}, true);
        testAssertion(
            `
            (a = 1 OR b > 2)
            AND
            (b < 5 OR c > 5)
            `,
            { a: 5, b: 7, c: 9 },
            true
        );
        testAssertion(
            `
            (
            (a = 1 OR b > 2)
            AND
            (b < 5 OR c > 5) AND (d = 11)
            )
            `,
            { a: 5, b: 7, c: 9, d: 11 },
            true
        );
        testAssertion(
            `
            (
            (a = 1
            OR
            b > 2)
            AND
            (b < 5
            OR c > 5)
            AND (d = 11)
            )
            `,
            { a: 5, b: 7, c: 9, d: 11 },
            true
        );
        testAssertion(
            `
            firstName = John AND
            profession = "Health Care"
            AND age = 23
            `,
            { firstName: 'John', lastName: 'Doe', age: 23, profession: 'Health Care' },
            true
        );
        testAssertion(
            `
            firstName = John AND
            profession = "Health
Care"
            AND age = 23
            `,
            { firstName: 'John', lastName: 'Doe', age: 23, profession: 'Health\nCare' },
            true
        );
    });
    it('should not parse tokens inside strings as operators', () => {
        testAssertion('a = "NOT test"', { a: 'NOT test' }, true);
        testAssertion('a = "a = 1 AND a > 0"', { a: 'a = 1 AND a > 0' }, true);
        testAssertion('a = "a = 1 AND a > 0" AND b = 5', { a: 'a = 1 AND a > 0', b: 5 }, true);
        testAssertion('(a = "a = 1 AND a > 0" AND (b = 5))', { a: 'a = 1 AND a > 0', b: 5 }, true);
    });
    it('should throw SyntaxError when incomplete logical operations are detected', () => {
        testError('A = 1 AND OR', new Error('SyntaxError: incomplete logical operation detected in A = 1 AND OR'));
        testError('(A = 1) AND OR', new Error('SyntaxError: incomplete logical operation detected in (A = 1) AND OR'));
        testError('(A = 1 AND) OR', new Error('SyntaxError: incomplete logical operation detected in A = 1 AND'));
        testError('A = 1 AND AND B = 2', new Error('SyntaxError: incomplete logical operation detected in A = 1 AND AND B = 2'));
        testError('A = 1 OR OR B = 2', new Error('SyntaxError: incomplete logical operation detected in A = 1 OR OR B = 2'));
        testError('A = 2 AND B = 3 OR OR', new Error('SyntaxError: incomplete logical operation detected in A = 2 AND B = 3 OR OR'));
        testError('NOT', new Error('SyntaxError: incomplete logical operation detected in NOT'));
        testError('AND', new Error('SyntaxError: incomplete logical operation detected in AND'));
        testError('OR', new Error('SyntaxError: incomplete logical operation detected in OR'));
        testError('NOT AND', new Error('SyntaxError: incomplete logical operation detected in NOT AND'));
        testError('AND AND', new Error('SyntaxError: incomplete logical operation detected in AND AND'));
        testError('OR OR', new Error('SyntaxError: incomplete logical operation detected in OR OR'));
        testError('OR NOT', new Error('SyntaxError: incomplete logical operation detected in OR NOT'));
    });
});