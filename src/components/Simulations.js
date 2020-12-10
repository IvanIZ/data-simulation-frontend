import React, { Component, useState } from 'react';
import ReactDOM from "react-dom"
import 'handsontable/dist/handsontable.full.css';
import '../App.css';
import {
  Collapse,
  Navbar,
  NavbarToggler,
  NavbarBrand,
  Container,
  Row,
  Col,
  Jumbotron,
  Nav,
  NavItem,
  NavLink,
  Button,
  Table, Modal, ModalHeader, ModalFooter, ModalBody, Form, FormGroup, Label, Input, ListGroup, Card, CardTitle, CardText
} from 'reactstrap';
import {
  BrowserRouter as Router,
  Route,
  Link,
  Redirect
} from "react-router-dom";

let simulation_type = "";

let num_prof = 0;

let account_info = [["Professor", "professor"], ["TA1", "ta1"], ["TA2", "ta2"], ["Family1", "family1"], ["Family2", "family2"], ["Family3", "family3"]];

class Simulation extends Component {

  constructor() {
    super();
    this.id = "hot";
    this.hotTableComponent = React.createRef();
    this.state = {
      collapsed: false,
      rows: [],
      cols: [],
      attri: [],
      items: Array.from({ length: 0 }),
      hasMore: false,
      load_from_buffer_to_matrix: false, 

      //retrieval display variables
      hasMoreResult: false,
      resultItems: Array.from({ length: 0 }), 
      load_result_from_buffer_to_matrix: false, 

      redirect_import_page: false, 
      import_page_link: '/result', 

      redirect_academic_page: false,
      academic_page_link: '/academic',

      redirect_management_page: false,
      management_page_link: '/management',

      redirect_financing_page: false,
      financing_page_link: '/financing',

      data_original: [], 
      check_cell_update: false, 

      test_block: "ORIGINAL MESSAGE", 
      users:[], 
      user_text_block: "", 

      isSelectPromptOpen: false, 
      user_name: "", 

      edit_message: "Last Edit: No modification yet", 
      history: [], 
      isShowHistoryOpen: false, 

      isConflictModalOpen: false, 

      transaction_mode: false, 
      isSharedLockRejectOpen: false,
      isExclusiveLockRejectOpen: false, 

      isLoginModalOpen: true, 
      username: "", 
      password: "", 
      isLoginRejectOpen: false
    }

    this.toggleSelectionPrompt = this.toggleSelectionPrompt.bind()
    this.toggleLoginModal = this.toggleLoginModal.bind();
    this.toggleLoginRejectModal = this.toggleLoginRejectModal.bind();
  }
  
  toggleLoginRejectModal = () => {
    this.setState({
      isLoginRejectOpen: !this.state.isLoginRejectOpen
    })
  }

  toggleLoginModal = () => {
    this.setState({
      isLoginModalOpen: !this.state.isLoginModalOpen
    })
  }

  toggleSelectionPrompt = () => {
    this.setState({
        isSelectPromptOpen: !this.state.isSelectPromptOpen
    })
  }

  redirect_import = () => {
    this.setState( {
      redirect_import_page: true
    })
  }

  select_simulation = (e) => {
    e.preventDefault();
    simulation_type = e.target.name;
    if (simulation_type === "academic") {
      this.setState({
        redirect_academic_page: true
      })
    }
    if (simulation_type === "management") {
      this.setState({
        redirect_management_page: true
      })
    }
    if (simulation_type === "financing") {
      this.setState({
        redirect_financing_page: true
      })
    }
  }

  handleLoginChange = (e) => {
    this.setState({
        [e.target.name]: e.target.value
    })
  }

  onLoginFormSubmit = (e) => {
    e.preventDefault();
    let username = this.state.username;
    let password = this.state.password;

    let account_found = false;
    for (var i = 0; i < account_info.length; i++) {
      if (username === account_info[i][0] && password === account_info[i][1]) {
        account_found = true;
        break;
      }
    }

    // login success
    if (account_found) {
      if (username === "Professor" || username === "TA1" || username === "TA2") {
        if (username === "Professor") {
          num_prof++;
        }
        console.log("number of prof is: ", num_prof);
        this.setState({
          redirect_academic_page: true
        });
      } 
      else if (username === "Family1" || username === "Family2" || username === "Family3") {
        this.setState({
          redirect_financing_page: true
        });
      }
    } 
    
    // reject login
    else {
      if (this.state.isLoginRejectOpen === false) {
        this.toggleLoginRejectModal();
      }
      this.toggleLoginModal();
    }
  }


  render() {
    if (this.state.redirect_import_page) {
      return <Redirect to={this.state.import_page_link} />
    }
    if (this.state.redirect_academic_page) {
      return <Redirect to={this.state.academic_page_link} />
    }
    if (this.state.redirect_management_page) {
      return <Redirect to={this.state.management_page_link} />
    }
    if (this.state.redirect_financing_page) {
      return <Redirect to={this.state.financing_page_link} />
    }
    return (
      <div className="App">
        <script src="node_modules/handsontable/dist/handsontable.full.min.js"></script>
        <link href="node_modules/handsontable/dist/handsontable.full.min.css" rel="stylesheet" media="screen"></link>
         <Jumbotron className='logo-jumbo'>
          </Jumbotron >
          <div>
          <Jumbotron >                
                  <h1 className="display-3">Hi {this.state.user_name}, welcome to spreadsheet web!</h1>
                  <p className="lead">Please click the login button below and enter your assigned username and password</p>
                  <hr className="my-2" />
                  <p>{this.state.user_text_block}</p>
                  <p className="lead">
                    <Button size='lg' className='display-button' color="info" onClick={this.toggleLoginModal} >Login</Button>
                  </p>

                  <Modal isOpen={this.state.isLoginRejectOpen} toggle={this.toggleLoginRejectModal}>
                    <ModalHeader toggle={this.toggleLoginRejectModal}>Login Fail</ModalHeader>
                    <ModalBody>
                      Sorry, the username and password you entered do not match. Please try again!
                    </ModalBody>

                    <ModalFooter>
                        <Button color="primary" onClick={this.toggleLoginModal}>
                          Try again
                        </Button>
                    </ModalFooter>
                  </Modal>

                  <Modal isOpen={this.state.isLoginModalOpen} toggle={this.toggleLoginModal} >
                    <ModalHeader toggle={this.toggleLoginModal}>Login</ModalHeader>
                    <ModalBody>
                      <Form onSubmit={this.onLoginFormSubmit}>
                        <FormGroup>
                          <Label for="username">Please enter your username</Label>
                          <Input type="text" name="username" id="username" onChange={e => this.handleLoginChange(e)} />
                        </FormGroup>
                        <FormGroup>
                          <Label for="password">Please enter your password</Label>
                          <Input type="text" name="password" id="password" onChange={e => this.handleLoginChange(e)} />
                        </FormGroup>
                        <Button color="primary" type="submit">Login</Button> {' '}
                      </Form>
                    </ModalBody>

                    <ModalFooter>
                        Forgot your userID? Well, check the document we sent you...
                    </ModalFooter>
                  </Modal>
                  

                  <Modal size='lg' isOpen={this.state.isSelectPromptOpen} >
                    <ModalHeader >Please Choose Your Assigned Simulation </ModalHeader>
                    <ModalBody>
                        <Row>
                            <Col sm="6">
                                <Card body>
                                <CardTitle tag="h5">Academic Simulation</CardTitle>
                                <CardText>Simulation on a university class environmenH</CardText>
                                <Button color="primary" name="academic" id="academic" onClick={e => this.select_simulation(e)}> Choose This Simulation</Button>
                                </Card>
                            </Col>
                            <Col sm="6">
                                <Card body>
                                <CardTitle tag="h5">Management Simulation</CardTitle>
                                <CardText>Simulation on management of employee schedules and project progress</CardText>
                                <Button color="info" name="management" id="management" onClick={e => this.select_simulation(e)}>Choose This Simulation</Button>
                                </Card>
                            </Col>
                        </Row>
                        <Row>
                            <Col sm="6">
                                <Card body>
                                <CardTitle tag="h5">Financing Simulation</CardTitle>
                                <CardText>Simulation family or company financing, involving expenses and incomes</CardText>
                                <Button color="primary" name="financing" id="financing" onClick={e => this.select_simulation(e)}>Choose This Simulation</Button>
                                </Card>
                            </Col>
                        </Row>
                    </ModalBody>
                  </Modal>

            {/* </Container> */}
        </Jumbotron>
        </div>

        <hr />
          
      </div>

    );
  }
}
export default Simulation;
