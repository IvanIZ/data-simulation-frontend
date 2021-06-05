import React, { Component, useState } from 'react';
import './App.css';
import { BrowserRouter, Route, Switch, HashRouter } from 'react-router-dom';

import Simulations from './components/Simulations';
import Academic from './components/Academic';
import Financing from './components/Financing';
import Management from './components/Management';
import Employees from './components/Employees';
// "handsontable": "^8.2.0",

class App extends Component {
  render() { 

    return (
      <div className="App">

           <BrowserRouter>
                <div>
                  {/* <Navbar /> */}
                  <Switch>
                    <Route path="/" component={Simulations} exact/>
                    <Route path="/academic" component={Academic}/>
                    <Route path="/financing" component={Financing}/>
                    <Route path="/management" component={Management}/>
                    <Route path="/employees" component={Employees}/>
                  </Switch>
                </div> 
            </BrowserRouter>
      </div>
    );
  }
}

export default App;
