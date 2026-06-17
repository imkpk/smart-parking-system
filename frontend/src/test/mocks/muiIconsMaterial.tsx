import { createElement } from 'react';

function MockMuiIcon() {
  return createElement('span', { 'aria-hidden': true, 'data-testid': 'mui-icon' });
}

export default MockMuiIcon;

export const Add = MockMuiIcon;
export const Brightness4 = MockMuiIcon;
export const Brightness7 = MockMuiIcon;
export const Cancel = MockMuiIcon;
export const Clear = MockMuiIcon;
export const Login = MockMuiIcon;
export const Logout = MockMuiIcon;
export const Search = MockMuiIcon;
export const Visibility = MockMuiIcon;