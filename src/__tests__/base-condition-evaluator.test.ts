import {describe, expect, it} from "@jest/globals";
import BaseConditionEvaluator from "../base-condition-evaluator";
import ExpressionContext from "../types/expression-context";
import operators from "../operators/operators";
import functions from "../functions/functions";

const evaluator = new BaseConditionEvaluator();

const testAssertion = (token: string, object: any, result: boolean) => {
    const ctx: ExpressionContext<any> = {
        expression: '',
        object,
        operators,
        functions
    };
    expect(evaluator.evaluate(token, ctx)).toEqual(result);
};

const testError = (token: string, object: any, expectedError: Error) => {
    const ctx: ExpressionContext<any> = {
        expression: '',
        object,
        operators,
        functions
    };
    expect(() => evaluator.evaluate(token, ctx)).toThrowError(expectedError);
};

describe('BaseConditionEvaluator tests', () => {
    it('should evaluate equality', () => {
        // numbers
        testAssertion('field = 1', { field: 1 }, true);
        testAssertion('field = 2', { field: 1 }, false);
        // strings
        testAssertion('field = value', { field: "value" }, true);
        testAssertion('field = "value"', { field: "value" }, true);
        testAssertion('field = "value 2"', { field: "value 2" }, true);
        testAssertion('field = "value \\"2\\""', { field: "value \"2\"" }, true);
        testAssertion('field = value', { field: "value 2" }, false);
        testAssertion('field = "value"', { field: "value 2" }, false);
        testAssertion('field = "value 2"', { field: "value 3" }, false);
        testAssertion('field = "value \\"2\\""', { field: "value \"3\"" }, false);
    });
    it('should evaluate IS', () => {
        // boolean
        testAssertion('field IS TRUE', { field: true }, true);
        testAssertion('field IS FALSE', { field: true }, false);
        testAssertion('field is true', { field: true }, true);
        testAssertion('field is false', { field: true }, false);
        testAssertion('field is FALSE', { field: false }, true);
        testAssertion('field IS false', { field: false }, true);
        testAssertion('field IS true', { field: false }, false);
    });
    it('should evaluate functions', () => {
        testAssertion('LEN(field) = 4', { field: 'test' }, true);
        testAssertion('LEN(field  ) = 4', { field: 'test' }, true);
        testAssertion('LEN(  field  ) = 4', { field: 'test' }, true);
        testAssertion('LEN(  field) = 4', { field: 'test' }, true);
    });
    it('should throw errors for invalid function syntax', () => {
        testError('LEN(field,  ) = 4', {}, new Error('SyntaxError: invalid function argument passed to LEN'));
        testError('LEN(field,) = 4', {}, new Error('SyntaxError: invalid function argument passed to LEN'));
        testError('LEN(field,,5) = 4', {}, new Error('SyntaxError: invalid function argument passed to LEN'));
        testError('LEN(,field) = 4', {}, new Error('SyntaxError: invalid function argument passed to LEN'));
        testError('LEN(  ,field) = 4', {}, new Error('SyntaxError: invalid function argument passed to LEN'));
    });
    it('should evaluate symbols regardless of whitespace', () => {
        testAssertion('field=5', { field: 5 }, true);
    });
    it('should throw errors for invalid operators / conditions', () => {
        testError('A ~ 1', {}, new Error('SyntaxError: received invalid condition A ~ 1'));
        testError('A == 1', {}, new Error('SyntaxError: received invalid condition A == 1'));
        testError('A==1', {}, new Error('SyntaxError: received invalid condition A==1'));
        testError('A CONTAINS 1', {}, new Error('SyntaxError: received invalid condition A CONTAINS 1'));
    });
});