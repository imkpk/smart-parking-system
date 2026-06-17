import { createElement } from 'react';

function MockMuiIcon() {
  return createElement('span', { 'aria-hidden': true, 'data-testid': 'mui-icon' });
}

export default MockMuiIcon;