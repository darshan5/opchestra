import { differenceInDays, differenceInMonths } from 'date-fns';

type FieldValues = Record<string, unknown>;

export function evaluateFormula(expression: string, fieldValues: FieldValues): string {
  try {
    let expr = expression;

    // Replace field references {fieldName} with their values
    expr = expr.replace(/\{([^}]+)\}/g, (_, fieldName) => {
      const val = fieldValues[fieldName.trim()];
      if (val === undefined || val === null) {
        return '0';
      }
      if (typeof val === 'number') {
        return String(val);
      }
      if (typeof val === 'string') {
        const num = parseFloat(val);
        if (!isNaN(num)) {
          return String(num);
        }
        return `"${val}"`;
      }
      return '0';
    });

    // Process functions
    expr = processFunctions(expr, fieldValues);

    // Evaluate arithmetic
    return String(safeEval(expr));
  } catch {
    return '#ERROR';
  }
}

function processFunctions(expr: string, fieldValues: FieldValues): string {
  // IF(condition, trueVal, falseVal)
  expr = expr.replace(
    /IF\(([^,]+),([^,]+),([^)]+)\)/gi,
    (_, cond, trueVal, falseVal) => {
      const condResult = safeEval(cond.trim());
      return condResult ? trueVal.trim() : falseVal.trim();
    },
  );

  // DAYS(date1, date2)
  expr = expr.replace(
    /DAYS\(([^,]+),([^)]+)\)/gi,
    (_, d1, d2) => {
      const date1 = resolveDate(d1.trim(), fieldValues);
      const date2 = resolveDate(d2.trim(), fieldValues);
      if (!date1 || !date2) {
        return '0';
      }
      return String(differenceInDays(date2, date1));
    },
  );

  // MONTHS(date1, date2)
  expr = expr.replace(
    /MONTHS\(([^,]+),([^)]+)\)/gi,
    (_, d1, d2) => {
      const date1 = resolveDate(d1.trim(), fieldValues);
      const date2 = resolveDate(d2.trim(), fieldValues);
      if (!date1 || !date2) {
        return '0';
      }
      return String(differenceInMonths(date2, date1));
    },
  );

  // SUM(a, b, c, ...)
  expr = expr.replace(
    /SUM\(([^)]+)\)/gi,
    (_, args) => {
      const nums = args.split(',').map((a: string) => parseFloat(a.trim()) || 0);
      return String(nums.reduce((s: number, n: number) => s + n, 0));
    },
  );

  // AVG(a, b, c, ...)
  expr = expr.replace(
    /AVG\(([^)]+)\)/gi,
    (_, args) => {
      const nums = args.split(',').map((a: string) => parseFloat(a.trim()) || 0);
      return nums.length > 0 ? String(nums.reduce((s: number, n: number) => s + n, 0) / nums.length) : '0';
    },
  );

  // MIN(a, b, ...)
  expr = expr.replace(
    /MIN\(([^)]+)\)/gi,
    (_, args) => {
      const nums = args.split(',').map((a: string) => parseFloat(a.trim()) || 0);
      return String(Math.min(...nums));
    },
  );

  // MAX(a, b, ...)
  expr = expr.replace(
    /MAX\(([^)]+)\)/gi,
    (_, args) => {
      const nums = args.split(',').map((a: string) => parseFloat(a.trim()) || 0);
      return String(Math.max(...nums));
    },
  );

  return expr;
}

function resolveDate(val: string, fieldValues: FieldValues): Date | null {
  // Check if it's a field reference
  const fieldMatch = val.match(/^\{([^}]+)\}$/);
  if (fieldMatch) {
    const fv = fieldValues[fieldMatch[1]];
    if (fv && typeof fv === 'string') {
      const d = new Date(fv);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  }
  // Try parsing as date string
  const stripped = val.replace(/^"|"$/g, '');
  const d = new Date(stripped);
  return isNaN(d.getTime()) ? null : d;
}

function safeEval(expr: string): number {
  const cleaned = expr.replace(/[^0-9+\-*/().><=! ]/g, '').trim();
  if (!cleaned) {
    return 0;
  }

  try {
    // Simple arithmetic evaluator — no eval()
    return parseArithmetic(cleaned);
  } catch {
    return 0;
  }
}

function parseArithmetic(expr: string): number {
  const tokens = expr.match(/(\d+\.?\d*|[+\-*/()]|>=|<=|>|<|==|!=)/g) ?? [];
  if (tokens.length === 0) {
    return 0;
  }

  let pos = 0;

  function parseExpr(): number {
    let left = parseTerm();
    while (pos < tokens.length && (tokens[pos] === '+' || tokens[pos] === '-')) {
      const op = tokens[pos++];
      const right = parseTerm();
      left = op === '+' ? left + right : left - right;
    }
    // Handle comparisons
    while (pos < tokens.length && ['>', '<', '>=', '<=', '==', '!='].includes(tokens[pos])) {
      const op = tokens[pos++];
      const right = parseTerm();
      if (op === '>') { left = left > right ? 1 : 0; }
      else if (op === '<') { left = left < right ? 1 : 0; }
      else if (op === '>=') { left = left >= right ? 1 : 0; }
      else if (op === '<=') { left = left <= right ? 1 : 0; }
      else if (op === '==') { left = left === right ? 1 : 0; }
      else if (op === '!=') { left = left !== right ? 1 : 0; }
    }
    return left;
  }

  function parseTerm(): number {
    let left = parseFactor();
    while (pos < tokens.length && (tokens[pos] === '*' || tokens[pos] === '/')) {
      const op = tokens[pos++];
      const right = parseFactor();
      left = op === '*' ? left * right : right !== 0 ? left / right : 0;
    }
    return left;
  }

  function parseFactor(): number {
    if (tokens[pos] === '(') {
      pos++;
      const val = parseExpr();
      if (tokens[pos] === ')') { pos++; }
      return val;
    }
    if (tokens[pos] === '-') {
      pos++;
      return -parseFactor();
    }
    const num = parseFloat(tokens[pos++] || '0');
    return isNaN(num) ? 0 : num;
  }

  return parseExpr();
}
