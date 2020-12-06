import React, { Component, useState } from 'react';
import ReactDOM from "react-dom"
import { HotTable } from '@handsontable/react';
// import Handsontable from 'handsontable';
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
  useHistory,
  Redirect
} from "react-router-dom";
import io from "socket.io-client";

let simulation_type = "";

// A JSON object that keeps track of previous layout changes
let layout_changes = {
  layout_changed: false,
  changes: [] // 1st element: action;  2nd element: index
}

let col_headers = []

let user_actions = []
let recorded_time = 0;

let SCROLL_SIZE = 5;

let data = [], dataMatrix = [], columns = [], buffer = [], buffer_copy = []
let PREFETCH_SIZE = 50
let noData = true
let ATT_NUM = 7
let prev_scrolltop = 0
let data_display = []
let chn_copy = []
let change_detected = false;

let current_fetch_index = 1 //initial pre-prefetch index
let num_attr = 0;

let current_i = -1;
let current_j = -1;
let currently_editing = false;

let conflict_i = -1;
let conflict_j = -1;
let incoming_value = "";
let conflict_message = "";

let select_i = -1; 
let select_j = -1;

let transaction_button = "";
let apply_read_only_lock_button = "";
let display_dataset_button = "";

let pending_changes = {
  data:[], // 2d array to store difference: y, value, x, 
  try_message: "SENT MESSAGE! SUCCESS!", 
  user: ""
}

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

      isSelectPromptOpen: true, 
      user_name: "", 

      edit_message: "Last Edit: No modification yet", 
      history: [], 
      isShowHistoryOpen: false, 

      isConflictModalOpen: false, 

      transaction_mode: false, 
      isSharedLockRejectOpen: false,
      isExclusiveLockRejectOpen: false, 

      // simulation_type: ""
    }

    // this.socket = io('localhost:3001');

    this.toggleSelectionPrompt = this.toggleSelectionPrompt.bind()
    this.toggleShowHistory = this.toggleShowHistory.bind()
    this.toggleConflictModal = this.toggleConflictModal.bind()
    this.toggleNavbar = this.toggleNavbar.bind()
    this.toggleSharedLockReject = this.toggleSharedLockReject.bind();
    this.toggleExclusiveLockReject = this.toggleExclusiveLockReject.bind();
  }

  // fetch 50 rows of data into the buffer
  async componentDidMount() {
    recorded_time = Date.now() / 1000;

    display_dataset_button = <Button size='lg' className='display-button' color="primary" onClick={this.display} >Display Dataset</Button> 

    this.hotTableComponent.current.hotInstance.addHook('afterChange', function(chn, src) {
      if (src === 'edit') {
        console.log(chn);
        
        // call check_cell_change if original and new data differ
        if (chn[0][2] !== chn[0][3] && chn[0][3].charAt(0) !== "*" && chn[0][3] !== "-----") {
          console.log("differ!");
          chn_copy = chn;
          change_detected = true;

          // remove currently editing state
          current_i = -1;
          current_j = -1;
          currently_editing = false;
        }
      }
    });

    this.hotTableComponent.current.hotInstance.addHook('afterBeginEditing', function(row, col) {

      // record the currently editing location and state. 
      current_i = row;
      current_j = col;
      // currently_editing = true;
      // console.log("current editing ", current_i, current_j);
    });

    this.hotTableComponent.current.hotInstance.addHook('afterSelection', function(row, column, row2, column2, preventScrolling, selectionLayerLevel) {

      // record the currently editing location and state. 
      select_i = row;
      select_j = column;
      // console.log(select_i, select_j);
      currently_editing = true;
    });

    this.hotTableComponent.current.hotInstance.addHook('afterCreateRow', function(index, amount, source) {
      console.log("insert index is: ", index);
      if (source === "ContextMenu.rowBelow") {
        layout_changes.layout_changed = true;
        layout_changes.changes.push(["insert_r", "below", index]);
      } else {
        layout_changes.layout_changed = true;
        layout_changes.changes.push(["insert_r", "above", index]);
      }
    });

    this.hotTableComponent.current.hotInstance.addHook('afterCreateCol', function(index, amount, source) {
      console.log("insert index is: ", index);
      if (source === "ContextMenu.columnRight") {
        layout_changes.layout_changed = true;
        layout_changes.changes.push(["insert_c", "right", index]);
      } else {
        layout_changes.layout_changed = true;
        layout_changes.changes.push(["insert_c", "left", index]);
      }
    });

    this.hotTableComponent.current.hotInstance.addHook('afterRemoveRow', function(index, amount, physicalRows, source) {
      layout_changes.layout_changed = true;
      layout_changes.changes.push(["remove_r", null, index]);
      // console.log("index: ", index);
      // console.log("amount: ", amount);
      // console.log("source: ", source);
    });

    this.hotTableComponent.current.hotInstance.addHook('afterRemoveCol', function(index, amount, physicalRows, source) {
      layout_changes.layout_changed = true;
      layout_changes.changes.push(["remove_c", null, index]);
      // console.log("index: ", index);
      // console.log("amount: ", amount);
      // console.log("source: ", source);
    });
  }

  componentWillUnmount() {
    this.socket.disconnect();
  }

  toggleNavbar = () => {
    this.setState({
      collapsed: !this.state.collapsed
    })
  }

  toggleExclusiveLockReject = () => {
    this.setState({
      isExclusiveLockRejectOpen: !this.state.isExclusiveLockRejectOpen
    })
  }

  toggleSharedLockReject = () => {
    this.setState({
      isSharedLockRejectOpen: !this.state.isSharedLockRejectOpen
    })
  }

  toggleConflictModal = () => {
    this.setState({
      isConflictModalOpen: !this.state.isConflictModalOpen
    })
  }

  toggleShowHistory = () => {
    this.setState({
      isShowHistoryOpen: !this.state.isShowHistoryOpen
    })
  }

  toggleSelectionPrompt = () => {
    this.setState({
        isSelectPromptOpen: !this.state.isSelectPromptOpen
    })
  }

  display = () => {
    display_dataset_button = "";
    if (this.state.transaction_mode) {
      transaction_button = <Button size='lg' className='display-button' color="primary" onClick={this.end_transaction} >End Transaction</Button> 
    } else {
      transaction_button = <Button size='lg' className='display-button' color="primary" onClick={this.start_transaction} >Start Transaction</Button>
    }
    this.setState({
      data_original: this.state.data_original.concat(buffer)
    })

    // fill in column headers and row headers
    if (data_display.length === 0) {
      data_display.push(col_headers);
    }
    data_display = data_display.concat(buffer_copy) 
    console.log("data display is: ", data_display);
  }

  redirect_import = () => {
    this.setState( {
      redirect_import_page: true
    })
  }

  handleScroll = (e) => {
    const bottom = e.target.scrollHeight - e.target.scrollTop === e.target.clientHeight;
    if (bottom) {
      // this.display()
    }
    prev_scrolltop = e.target.scrollTop;
  }

  show_state = () => {
    console.log(chn_copy);
    console.log(change_detected);
  }

  check_cell_change = () => {
    if (change_detected) {

      // find current state
      let state = "Y"; //  Y means in a transaction
      if (!this.state.transaction_mode) {
        state = "N";
      }

      // extract features of the new value
      let feature = "";
      if (isNaN(chn_copy[0][3])) {
        feature = "STR";
      } else {
        feature = "DIGIT";
      }

      // record user action
      user_actions.push(["edit_cell", chn_copy[0][0], chn_copy[0][1], feature, chn_copy[0][0] + 1, col_headers[chn_copy[0][1]], state]);

      // this.request_exclusive_lock(chn_copy[0][0], chn_copy[0][1]);
      
      pending_changes.user = this.state.user_name
  
      let temp = [];
      let y_coord = parseInt(chn_copy[0][0]) + 1;
      let x_coord = parseInt(chn_copy[0][1]) + 1;
      let actual_value = chn_copy[0][3];
      temp[0] = x_coord;
      temp[1] = actual_value;
      temp[2] = y_coord;
      pending_changes.data.push(temp);
      change_detected = false;
    } else {
      console.log("no changed detected")
    }
  }

  cell_read_only = (input_row, input_col) => {
    this.hotTableComponent.current.hotInstance.updateSettings({
      cells: function(row, col, prop){
       var cellProperties = {};
         if(row === input_row && col === input_col){
           cellProperties.readOnly = 'true'
         }
       return cellProperties
     }
   })
  }


  hangleUsername = (e) => {
    this.setState({
        [e.target.name]: e.target.value
    })
  }

  resolve_conflict = (e) => {
      e.preventDefault();
      data_display[conflict_i][conflict_j] = incoming_value;
      this.state.data_original[conflict_i][conflict_j] = incoming_value;

      // reset conflict records
      conflict_i = -1;
      conflict_j = -1;
      incoming_value = -1;
      conflict_message = "";
      this.toggleConflictModal();
  }

  start_transaction = () => {
    pending_changes.data = []
    this.setState({
      transaction_mode: true
    })
    transaction_button = <Button size='lg' className='display-button' color="primary" onClick={this.end_transaction} >End Transaction</Button> 
    //apply_read_only_lock_button = <Button size='lg' className='display-button' color="primary" onClick={this.request_shared_lock} >Apply Read-Only Lock</Button> 
  }

  end_transaction = () => {
    // setTimeout(() => {
    //   this.commit_transaction();
    // }, 500);
    this.setState({
      transaction_mode: false
    })
    transaction_button = <Button size='lg' className='display-button' color="primary" onClick={this.start_transaction} >Start Transaction</Button>

    // tell the backend that transaction is completed
  }

  track_action = (e, action_type) => {

    // find current state
    let state = "Y"; //  Y means in a transaction
    if (!this.state.transaction_mode) {
      state = "N";
    }

    // calculate idle time and record idle action if necessary
    let idle_duration = (Date.now() / 1000) - recorded_time;
    recorded_time = (Date.now() / 1000);
    if (idle_duration > 3) {

      // check if we can merge two idle periods together
      if (user_actions.length > 0 && user_actions[user_actions.length - 1][0] === "idle") {
        let prev_idle_time = user_actions[user_actions.length - 1][1];
        user_actions.pop();
        user_actions.push(["idle", parseInt(idle_duration) + prev_idle_time, null, null, null, null, state]);
      } else {
        user_actions.push(["idle", parseInt(idle_duration), null, null, null, null, state]);
      }
    }

    // check and update possible spreadsheet layout change
    if (layout_changes.layout_changed) { 
      
      // remove prev idle action
      if (user_actions.length > 0 && user_actions[user_actions.length - 1][0] === "idle") {
        user_actions.pop();
      }

      // add in all layout changes
      for (var i = 0; i < layout_changes.changes.length; i++) {
        let layout_change_type = layout_changes.changes[i][0];
        let layout_change_direction = layout_changes.changes[i][1];
        let change_index = layout_changes.changes[i][2];
        user_actions.push([layout_change_type, change_index, layout_change_direction, null, null, null, state]); 
      }

      // clear up current layout_changes recorder
      layout_changes.changes.length = 0;
      layout_changes.layout_changed = false;
    }

    // handle scroll actions
    if (action_type === "scroll") {

      let scroll_diff = prev_scrolltop - e.target.scrollTop;
      let action_length = user_actions.length;

      // don't hace scroll_diff === 0 because each scroll on mouse will result in two identical function calls
      if (scroll_diff > 0) {
        
        // check if previous is a large up scroll. If so, do nothing
        if (action_length >= 1 && user_actions[action_length - 1][0] === "up_scroll_l") {
          // deliberately do nothing here
        }

        // check for combining 6 small up scrolls
        else if (action_length >= SCROLL_SIZE) {
          let combine = true;
          for (var i = 0; i < SCROLL_SIZE; i++) {
              if (user_actions[action_length - 1 - i][0] !== "up_scroll_s") {
                combine = false;
                break;
              }
          }

          if (combine) {
            for (var i = 0; i < SCROLL_SIZE; i++) {
                user_actions.pop();
            }
            user_actions.push(["up_scroll_l", null, null, null, null, null, state]);
          }

          else {
            user_actions.push(["up_scroll_s", null, null, null, null, null, state]);
          }
        }

        else {
          user_actions.push(["up_scroll_s", null, null, null, null, null, state]);
        }

      } else if (scroll_diff < 0) {

        // check if previous is a large down scroll. If so, do nothing
        if (action_length >= 1 && user_actions[action_length - 1][0] === "down_scroll_l") {
            // deliberately do nothing here
        }

        // check for combining 6 small scrolls
        else if (action_length >= SCROLL_SIZE) {
          let combine = true;
          for (var i = 0; i < SCROLL_SIZE; i++) {
              if (user_actions[action_length - 1 - i][0] !== "down_scroll_s") {
                combine = false;
                break;
              }
          }
          
          if (combine) {
            for (var i = 0; i < SCROLL_SIZE; i++) {
                user_actions.pop();
            }
            user_actions.push(["down_scroll_l", null, null, null, null, null, state]);
          }

          else {
            user_actions.push(["down_scroll_s", null, null, null, null, null, state]);
          }
        } 

        else {
          user_actions.push(["down_scroll_s", null, null, null, null, null, state]);
        }
      }
      this.handleScroll(e);
    }

    // calculate click action
    else if (action_type === "click") {

      if (currently_editing) {
        
        // select a row
        if (select_j < 0) {
          user_actions.push(["select_r", select_i, null, null, null, null, state]);
        }

        // select a column
        else if (select_i < 0) {
          user_actions.push(["select_c", select_j, null, null, null, null, state]);
        }
        
        // select a cell
        else {
          user_actions.push([action_type, select_i, select_j, null, select_i + 1, col_headers[select_j], state]);
        }
        currently_editing = false;
      }
      this.check_cell_change();
    }

    // calculate kepress action
    else if (action_type === "key_press") {

      if (change_detected) {
        // handle enter press
        if (e.key === "Enter") {
          user_actions.push(["keyPress_enter", chn_copy[0][0], chn_copy[0][1], null, chn_copy[0][0] + 1, col_headers[chn_copy[0][1]], state ]);
        }

        // handle tab press
        else if (e.key === "Tab") {
          user_actions.push(["keyPress_tab", chn_copy[0][0], chn_copy[0][1], null, chn_copy[0][0] + 1, col_headers[chn_copy[0][1]], state]);
        }

        // all other press 
        else {
          user_actions.push(["keyPress", chn_copy[0][0], chn_copy[0][1], null, chn_copy[0][0] + 1, col_headers[chn_copy[0][1]], state]);
        }
      }
      this.check_cell_change();
    }
    console.log(user_actions);
  }

  store_training_data = () => {
    user_actions.push(["END_TRAINING_DATA", null, null, null, null, null, "END"]);
    let action_package = {
      user_actions: user_actions
    }
    //POST req here
    const requestOptions = {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({action_package})
    };
    fetch('/training/send-training-data/' + simulation_type, requestOptions)
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
      <div onClick={e => this.track_action(e, "click")} onKeyUp={e => this.track_action(e, "key_press")} className="App">
        <script src="node_modules/handsontable/dist/handsontable.full.min.js"></script>
        <link href="node_modules/handsontable/dist/handsontable.full.min.css" rel="stylesheet" media="screen"></link>
         <Jumbotron className='logo-jumbo'>
          </Jumbotron >
          <div>
          <Jumbotron >
            {/* <Container fluid> */}
                <Navbar color="faded" light>
                  <NavbarToggler onClick={this.toggleNavbar} className="mr-2" />
                  <Collapse isOpen={this.state.collapsed} navbar>
                    <Nav tabs>
                      <NavItem>
                        <NavLink href="/result">Import Page</NavLink>
                      </NavItem>
                    </Nav>
                  </Collapse>
                </Navbar>
                  <h1 className="display-3">Hi {this.state.user_name}, welcome to spreadsheet web!</h1>
                  <p className="lead">This is a simple web interface that allows you to upload spreadsheets and retrieve data.</p>
                  <hr className="my-2" />
                  <p>{this.state.user_text_block}</p>
                  <p className="lead">
                    <Button size='lg' className='display-button' color="info" onClick={this.toggleShowHistory} >Edit History</Button>
                    &nbsp;&nbsp;&nbsp;&nbsp;
                    {display_dataset_button}
                    &nbsp;&nbsp;&nbsp;&nbsp;
                    {transaction_button}
                    &nbsp;&nbsp;&nbsp;&nbsp;
                    {apply_read_only_lock_button}
                    &nbsp;&nbsp;&nbsp;&nbsp;
                    <Button size='lg' className='display-button' color="info" onClick={this.store_training_data} >Complete Simulation</Button>
                  </p>
                  <p>{this.state.edit_message}</p>
                  

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

                  <Modal size='lg' isOpen={this.state.isShowHistoryOpen} toggle={this.toggleShowHistory}>
                    <ModalHeader toggle={this.toggleShowHistory}>File Edit History</ModalHeader>
                    <ModalBody>
                      <Table striped className="history-table">
                        <tbody>
                            {this.state.history.map(line => 
                              <tr key = {line}>
                                <td>{line}</td>
                              </tr>
                            )}
                        </tbody>
                      </Table>
                    </ModalBody>
                    <ModalFooter>
                      <Button size='lg' color="primary" className='single_search_submit' onClick={this.toggleShowHistory}>Close</Button> {' '}
                    </ModalFooter>
                  </Modal>

                  <Modal size='lg' isOpen={this.state.isConflictModalOpen} toggle={this.toggleConflictModal}>
                    <ModalHeader toggle={this.toggleConflictModal}>Conflicting Incoming Changes from Other Users </ModalHeader>
                    <ModalBody>
                      {conflict_message}
                    </ModalBody>
                    <ModalFooter>
                      <Button size='lg' color="primary" className="btn btn-primary btn-sm" onClick={this.resolve_conflict} block>Accept Incoming Changes</Button> {' '}
                      <Button size='lg' color="secondary" className="btn btn-primary btn-sm" onClick={this.toggleConflictModal} block>Ignore Incoming Changes</Button>
                    </ModalFooter>
                  </Modal>

                  <Modal size='lg' isOpen={this.state.isSharedLockRejectOpen} toggle={this.toggleSharedLockReject}>
                    <ModalHeader toggle={this.toggleSharedLockReject}>Lock Request Rejection </ModalHeader>
                    <ModalBody>
                      Cannot place a read-only lock on a cell with an exclusive lock!
                    </ModalBody>
                    <ModalFooter>
                      <Button size='lg' color="primary" className="btn btn-primary btn-sm" onClick={this.toggleSharedLockReject} block>Got it</Button> {' '}
                    </ModalFooter>
                  </Modal>

                  <Modal size='lg' isOpen={this.state.isExclusiveLockRejectOpen} toggle={this.toggleExclusiveLockReject}>
                    <ModalHeader toggle={this.toggleExclusiveLockReject}>Lock Request Rejection </ModalHeader>
                    <ModalBody>
                      Cannot place an exclusive lock on a cell with a lock already! 
                    </ModalBody>
                    <ModalFooter>
                      <Button size='lg' color="primary" className="btn btn-primary btn-sm" onClick={this.toggleExclusiveLockReject} block>Got it</Button> {' '}
                    </ModalFooter>
                  </Modal>
            {/* </Container> */}
        </Jumbotron>
        </div>

        <hr />
        Below Is The Entire Data Set  
        {/* <div id = "display_portion" onClick={this.check_cell_change} onKeyUp={this.check_cell_change} onScroll={this.handleScroll}  tabIndex="1"> */}
        <div id = "display_portion" onScroll={e => this.track_action(e, "scroll")}  tabIndex="1">
          <HotTable className="handsontable" id ="display_table" data={data_display} ref={this.hotTableComponent} id={this.id}
            colHeaders={true} 
            rowHeaders={true} 
            width="100%" 
            height="300"
            colWidths="100%"
            rowHeights="25"
            contextMenu={true}
            formulas={true}
            readOnly={!this.state.transaction_mode}
            />
        </div>
          
      </div>

    );
  }
}
export default Simulation;
