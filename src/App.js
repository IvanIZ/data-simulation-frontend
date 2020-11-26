import React, { Component, useState } from 'react';
import logo from './logo.svg';
import './App.css';

import {
  Collapse,
  Navbar,
  NavbarToggler,
  NavbarBrand,
  Nav,
  NavItem,
  NavLink,
  Container,
  Row,
  Col,
  Jumbotron,
  Button,
  Table, Modal, ModalHeader, ModalFooter, ModalBody
} from 'reactstrap';
import { BrowserRouter, Route, Switch, HashRouter } from 'react-router-dom';

import Simulations from './components/Simulations';
import Academic from './components/Academic';

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
                    {/* <Route path="/result" component={Result}/>
                    <Route path="/start" component={Start}/>
                    <Route path="/academic" component={Academic}/>
                    <Route path="/management" component={Management}/>
                    <Route path="/financing" component={Financing}/> */}
                  </Switch>
                </div> 
            </BrowserRouter>
      </div>
    );
  }
}

export default App;
