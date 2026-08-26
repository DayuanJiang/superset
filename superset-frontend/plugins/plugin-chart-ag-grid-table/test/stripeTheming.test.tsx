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
import { render, waitFor } from '@superset-ui/core/spec';
import { supersetTheme } from '@apache-superset/core/theme';
import { ProviderWrapper } from '../../plugin-chart-table/test/testHelpers';
import testData from '../../plugin-chart-table/test/testData';

// Capture the props the grid is rendered with, so we can assert the striping
// override without depending on AG Grid's DOM rendering.
const captured: { props?: Record<string, any> } = {};

// Mock the narrow ThemedAgGridReact module (which the components barrel
// re-exports) rather than the whole barrel, to avoid its circular-init.
jest.mock('@superset-ui/core/components/ThemedAgGridReact', () => ({
  __esModule: true,
  ThemedAgGridReact: (props: Record<string, any>) => {
    captured.props = props;
    return null;
  },
  AgGridReact: function AgGridReact() {
    return null;
  },
  AllCommunityModule: {},
  ClientSideRowModelModule: {},
  ModuleRegistry: { registerModules: () => undefined },
  setupAGGridModules: () => undefined,
  defaultModules: [],
  themeQuartz: {},
  colorSchemeDark: {},
  colorSchemeLight: {},
}));

// Imported after the mock is declared (jest.mock is hoisted above imports).
// eslint-disable-next-line import/first
import AgGridTableChart from '../src/AgGridTableChart';
// eslint-disable-next-line import/first
import transformProps from '../src/transformProps';

function renderChart() {
  captured.props = undefined;
  render(
    ProviderWrapper({
      children: (
        <AgGridTableChart
          {...transformProps(testData.basic)}
          setDataMask={jest.fn()}
          slice_id={1}
        />
      ),
    }),
  );
}

test('odd rows are striped with colorBgLayout, matching the classic table chart', async () => {
  renderChart();
  await waitFor(() => expect(captured.props).toBeDefined());

  expect(supersetTheme.colorBgLayout).toBeDefined();
  expect(captured.props?.themeOverrides).toMatchObject({
    oddRowBackgroundColor: supersetTheme.colorBgLayout,
  });
});
