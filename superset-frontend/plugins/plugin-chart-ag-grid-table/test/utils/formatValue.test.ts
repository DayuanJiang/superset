/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { ValueFormatterParams } from '@superset-ui/core/components/ThemedAgGridReact';
import { valueFormatter, valueGetter } from '../../src/utils/formatValue';
import getCellClass from '../../src/utils/getCellClass';
import DateWithFormatter from '../../src/utils/DateWithFormatter';
import { InputColumn } from '../../src/types';

const textCol = { key: 'name', isNumeric: false } as InputColumn;
const numericCol = { key: 'count', isNumeric: true } as InputColumn;

const formatterParams = (overrides: Record<string, unknown>) =>
  ({ node: { level: 0 }, ...overrides }) as unknown as ValueFormatterParams;

const cellClassParams = (overrides: Record<string, unknown>) =>
  ({
    col: textCol,
    emitCrossFilters: false,
    node: { rowPinned: undefined },
    ...overrides,
  }) as unknown as Parameters<typeof getCellClass>[0];

test('valueFormatter renders NULL values as "N/A"', () => {
  expect(valueFormatter(formatterParams({ value: null }), textCol)).toBe('N/A');
  expect(valueFormatter(formatterParams({ value: undefined }), textCol)).toBe(
    'N/A',
  );
  expect(
    valueFormatter(
      formatterParams({ value: new DateWithFormatter(null) }),
      textCol,
    ),
  ).toBe('N/A');
});

test('valueFormatter leaves an empty string empty', () => {
  expect(valueFormatter(formatterParams({ value: '' }), textCol)).toBe('');
  expect(valueFormatter(formatterParams({ value: '' }), numericCol)).toBe('');
});

test('valueFormatter renders NULL values in the pinned Summary row as empty', () => {
  expect(
    valueFormatter(
      formatterParams({ value: null, node: { level: -1 } }),
      textCol,
    ),
  ).toBe('');
});

test('valueGetter returns null for missing values so they format as NULL', () => {
  const params = {
    data: {},
    colDef: {},
    column: { getColId: () => 'name' },
  } as unknown as Parameters<typeof valueGetter>[0];
  expect(valueGetter(params, textCol)).toBeNull();
});

test('getCellClass marks NULL cells with dt-is-null', () => {
  expect(getCellClass(cellClassParams({ value: null }))).toContain(
    'dt-is-null',
  );
  expect(
    getCellClass(cellClassParams({ value: new DateWithFormatter(null) })),
  ).toContain('dt-is-null');
});

test('getCellClass does not mark empty strings, values or pinned rows as NULL', () => {
  expect(getCellClass(cellClassParams({ value: '' }))).not.toContain(
    'dt-is-null',
  );
  expect(getCellClass(cellClassParams({ value: 'Paris' }))).not.toContain(
    'dt-is-null',
  );
  expect(
    getCellClass(
      cellClassParams({ value: null, node: { rowPinned: 'bottom' } }),
    ),
  ).not.toContain('dt-is-null');
});
