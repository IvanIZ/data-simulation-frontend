import React, { Component, useState } from 'react';
import ReactDOM from "react-dom"
import { HotTable } from '@handsontable/react';
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
  Table, Modal, ModalHeader, ModalFooter, ModalBody, Form, FormGroup, Label, Input, ListGroup, Card, CardTitle, CardText, TabContent, TabPane, ButtonDropdown, Dropdown, DropdownToggle, DropdownMenu, DropdownItem, UncontrolledTooltip
} from 'reactstrap';
import {
  BrowserRouter as Router,
  Route,
  Link,
  useHistory,
  Redirect
} from "react-router-dom";
import classnames from 'classnames';
import io from "socket.io-client";


const Utils = require('../utils');
let utils = new Utils();

let layout_modifications = {
  layout_changed: false,
  changes: []
}

// A JSON object that keeps track of previous layout changes
let layout_changes = {
  incoming: false,
  layout_changed: false,
  changes: [], // 1st element: action;  2nd element: index
  start_idx: 0, 
  socketID: ""
}

let table_loaded = false;

let user_actions = []

let SCROLL_SIZE = 5;

let data = [];
let load_error = [[0]];
let prev_scrolltop = 0
let chn_copy = []
let change_detected = false;

let current_i = -1;
let current_j = -1;
let currently_editing = false;

let select_i = -1; 
let select_j = -1;
let after_selection = false;


let pending_changes = {
  data:[], // 2d array to store difference: y, value, x, 
  try_message: "SENT MESSAGE! SUCCESS!", 
  socketID: "",
  user: "", 
  incoming: false
}

let socket_id = "";

// employee schema related info
let employees_schema = "";
let tables = [];
let current_table = [];
let last_QA_time = 0;
let begin_edit_time = 0;

class Employees extends Component {

  constructor() {
    super();
    this.id = "hot";
    this.hotTableComponent = React.createRef();
    this.hotTableComponent1 = React.createRef();
    this.hotTableComponent2 = React.createRef();
    this.hotTableComponent3 = React.createRef();
    this.hotTableComponent4 = React.createRef();
    this.hotTableComponent5 = React.createRef();
    this.state = {

      import_page_link: '/result', 

      data_original: [], 
      check_cell_update: false, 

      test_block: "ORIGINAL MESSAGE", 
      users:[], 
      user_text_block: "", 

      user_name: "", 

      edit_message: "Last Edit: No modification yet", 
      history: [], 
      isShowHistoryOpen: false, 

      isInstructionOpen: true,
      activeTab: '1', 

      isNameModalOpen: false, 
      name: "", 
      curr_table: "Titles", 

      isRestartModalOpen: false, 
      user_actions: [], 

      isCompleteConfirmationModalOpen: false, 

      refresh: false, 
      isLoadErrorModelOpen: false, 

      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight, 

      clientX: 0,
      clientY: 0,
      pageX: 0, 
      pageY: 0, 

      firstVisibleRow: 0,
      lastVisibleRow: 21
    }

    this.socket = io('https://spreadsheetactions.herokuapp.com/');
    // this.socket = io('localhost:3001');

    // receive existing tables
    this.socket.on('UPDATE_FRONTEND_TABLE', function(data){
      employees_schema = data;
      console.log(employees_schema)
    });

    this.socket.on('RECEIVE_ID', function(id){
      layout_changes.socketID = id;
      pending_changes.socketID = id;
      change_id(id);
    });

    // update current list of online users when a new user joins
    this.socket.on('ADD_NEW_USER', function(data) {
      console.log("adding new user");
      addNewUser(data);
    });

    // update current list of online users when one user is disconnected
    this.socket.on('CHANGE_CURRENT_USER', function(data) {
      change_current_user(data);
    });


    const change_id = id => {
      socket_id = id;
    }

    const addNewUser = data => {
      this.setState({
        history: data.history
      })
      change_current_user(data);
    }

    const change_current_user = data => {
      if (data.simulation === "academic") {
      
        this.setState({
          users: data.current_users
        });
        let new_user_text = "Currently Online: ";
        for (var i = 0; i < this.state.users.length; i++) {
          if (i == this.state.users.length - 1) {
            new_user_text += this.state.users[i]
          } else {
            new_user_text += this.state.users[i] + ", "
          }
        }
        this.setState({
          user_text_block: new_user_text
        });
      }
    }

    this.toggleInstructionModal = this.toggleInstructionModal.bind();
    this.toggleNameModal = this.toggleNameModal.bind();
    this.toggleRestartModal = this.toggleRestartModal.bind();
    this.toggleCompleteConfirmModal = this.toggleCompleteConfirmModal.bind();
    this.toggleLoadErrorModal = this.toggleLoadErrorModal.bind();
  }

  // fetch 50 rows of data into the buffer
  async componentDidMount() {

    const handleResize = (e) => {
      this.setState({ windowWidth: window.innerWidth,
       windowHeight: window.innerHeight});
    };
    window.addEventListener("resize", handleResize);

    this.socket.emit('REQUEST_TABLES');

    // FIRST COMPONENT REF ========================================================================================
    this.hotTableComponent.current.hotInstance.addHook('afterChange', function(chn, src) {
      if (src === 'edit') {
        
        // call check_cell_change if original and new data differ
        if (chn[0][2] !== chn[0][3]) {
          console.log("differ!");
          chn_copy = chn;
          if (chn_copy[0][3] === null) {
            chn_copy[0][3] = "";
          }
          change_detected = true;

          // remove currently editing state
          current_i = -1;
          current_j = -1;
          currently_editing = false;
        }
      }
    });

    this.hotTableComponent.current.hotInstance.addHook('afterBeginEditing', function(row, col) {
      
      // get current chicago time
      const date = new Date();
      begin_edit_time = date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();

      current_i = row;
      current_j = col;
    });

    this.hotTableComponent.current.hotInstance.addHook('afterSelection', function(row, column, row2, column2, preventScrolling, selectionLayerLevel) {

      // record the currently editing location and state. 
      select_i = row;
      select_j = column;
      after_selection = true;
      currently_editing = true;
      console.log("select cell")
      console.log("row: ", select_i);
      console.log("col: ", select_j);
    });

    this.hotTableComponent.current.hotInstance.addHook('afterCreateRow', function(index, amount, source) {
      // get current chicago time
      const date = new Date();
      let curr_time = date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();

      layout_modifications.layout_changed = true;
      layout_modifications.changes.push(["insert_row", index, curr_time, "Titles", current_table[index][0]]); // [action_name, index, curr_time, table_name, primary key]
    });

    this.hotTableComponent.current.hotInstance.addHook('beforeCreateCol', function(data, coords) {
      // disable create col
      return false;
    });

    this.hotTableComponent.current.hotInstance.addHook('beforeRemoveRow', function(index, amount) {

      // get current chicago time
      const date = new Date();
      let curr_time = date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();

      layout_modifications.layout_changed = true;
      layout_modifications.changes.push(["remove_row", index, curr_time, "Titles", current_table[index][0]]); // [action_name, index, curr_time, table_name, primary key]
    });


    this.hotTableComponent.current.hotInstance.addHook('beforeRemoveCol', function(index, amount) {
      // disable column removal
      return false;
    });

    // SECOND COMPONENT REF ========================================================================================
    this.hotTableComponent1.current.hotInstance.addHook('afterChange', function(chn, src) {
      if (src === 'edit') {
        
        // call check_cell_change if original and new data differ
        if (chn[0][2] !== chn[0][3]) {
          console.log("differ!");
          chn_copy = chn;
          if (chn_copy[0][3] === null) {
            chn_copy[0][3] = "";
          }
          change_detected = true;

          // remove currently editing state
          current_i = -1;
          current_j = -1;
          currently_editing = false;
        }
      }
    });

    this.hotTableComponent1.current.hotInstance.addHook('afterBeginEditing', function(row, col) {

      // get current chicago time
      const date = new Date();
      begin_edit_time = date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();

      current_i = row;
      current_j = col;
    });

    this.hotTableComponent1.current.hotInstance.addHook('afterSelection', function(row, column, row2, column2, preventScrolling, selectionLayerLevel) {

      // record the currently editing location and state. 
      select_i = row;
      select_j = column;
      after_selection = true;
      currently_editing = true;
    });

    this.hotTableComponent1.current.hotInstance.addHook('afterCreateRow', function(index, amount, source) {
      // get current chicago time
      const date = new Date();
      let curr_time = date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();

      layout_modifications.layout_changed = true;
      layout_modifications.changes.push(["insert_row", index, curr_time, "Salaries", current_table[index][0]]); // [action_name, index, curr_time, table_name, primary key]
    });

    this.hotTableComponent1.current.hotInstance.addHook('beforeCreateCol', function(data, coords) {
      return false;
    });

    this.hotTableComponent1.current.hotInstance.addHook('beforeRemoveRow', function(index, amount) {

      // get current chicago time
      const date = new Date();
      let curr_time = date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();

      layout_modifications.layout_changed = true;
      layout_modifications.changes.push(["remove_row", index, curr_time, "Salaries", current_table[index][0]]); // [action_name, index, curr_time, table_name, primary key]
    });

    this.hotTableComponent1.current.hotInstance.addHook('beforeRemoveCol', function(index, amount) {
      return false;
    });

    // THIRD COMPONENT REF ========================================================================================
    this.hotTableComponent2.current.hotInstance.addHook('afterChange', function(chn, src) {
      if (src === 'edit') {
        
        // call check_cell_change if original and new data differ
        if (chn[0][2] !== chn[0][3]) {
          console.log("differ!");
          chn_copy = chn;
          if (chn_copy[0][3] === null) {
            chn_copy[0][3] = "";
          }
          change_detected = true;

          // remove currently editing state
          current_i = -1;
          current_j = -1;
          currently_editing = false;
        }
      }
    });

    this.hotTableComponent2.current.hotInstance.addHook('afterBeginEditing', function(row, col) {

      // get current chicago time
      const date = new Date();
      begin_edit_time = date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();

      current_i = row;
      current_j = col;
    });

    this.hotTableComponent2.current.hotInstance.addHook('afterSelection', function(row, column, row2, column2, preventScrolling, selectionLayerLevel) {

      // record the currently editing location and state. 
      select_i = row;
      select_j = column;
      after_selection = true;
      currently_editing = true;
    });

    this.hotTableComponent2.current.hotInstance.addHook('afterCreateRow', function(index, amount, source) {
      // get current chicago time
      const date = new Date();
      let curr_time = date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();

      layout_modifications.layout_changed = true;
      layout_modifications.changes.push(["insert_row", index, curr_time, "Employees", current_table[index][0]]); // [action_name, index, curr_time, table_name, primary key]
    });

    this.hotTableComponent2.current.hotInstance.addHook('beforeCreateCol', function(data, coords) {
      return false;
    });

    this.hotTableComponent2.current.hotInstance.addHook('beforeRemoveRow', function(index, amount) {

      // get current chicago time
      const date = new Date();
      let curr_time = date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();

      layout_modifications.layout_changed = true;
      layout_modifications.changes.push(["remove_row", index, curr_time, "Employees", current_table[index][0]]); // [action_name, index, curr_time, table_name, primary key]
    });

    this.hotTableComponent2.current.hotInstance.addHook('beforeRemoveCol', function(index, amount) {
      return false;
    });


    // FOURTH COMPONENT REF ========================================================================================
    this.hotTableComponent3.current.hotInstance.addHook('afterChange', function(chn, src) {
      if (src === 'edit') {
        
        // call check_cell_change if original and new data differ
        if (chn[0][2] !== chn[0][3]) {
          console.log("differ!");
          chn_copy = chn;
          if (chn_copy[0][3] === null) {
            chn_copy[0][3] = "";
          }
          change_detected = true;

          // remove currently editing state
          current_i = -1;
          current_j = -1;
          currently_editing = false;
        }
      }
    });

    this.hotTableComponent3.current.hotInstance.addHook('afterBeginEditing', function(row, col) {

      // get current chicago time
      const date = new Date();
      begin_edit_time = date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();

      current_i = row;
      current_j = col;
    });

    this.hotTableComponent3.current.hotInstance.addHook('afterSelection', function(row, column, row2, column2, preventScrolling, selectionLayerLevel) {

      // record the currently editing location and state. 
      select_i = row;
      select_j = column;
      after_selection = true;
      currently_editing = true;
    });

    this.hotTableComponent3.current.hotInstance.addHook('afterCreateRow', function(index, amount, source) {
      // get current chicago time
      const date = new Date();
      let curr_time = date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();

      layout_modifications.layout_changed = true;
      layout_modifications.changes.push(["insert_row", index, curr_time, "Dept_manager", current_table[index][0]]); // [action_name, index, curr_time, table_name, primary key]
    });

    this.hotTableComponent3.current.hotInstance.addHook('beforeCreateCol', function(data, coords) {
      return false;
    });

    this.hotTableComponent3.current.hotInstance.addHook('beforeRemoveRow', function(index, amount) {

      // get current chicago time
      const date = new Date();
      let curr_time = date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();

      layout_modifications.layout_changed = true;
      layout_modifications.changes.push(["remove_row", index, curr_time, "Dept_manager", current_table[index][0]]); // [action_name, index, curr_time, table_name, primary key]
    });

    this.hotTableComponent3.current.hotInstance.addHook('beforeRemoveCol', function(index, amount) {
      return false;
    });


    // FIFTH COMPONENT REF ========================================================================================
    this.hotTableComponent4.current.hotInstance.addHook('afterChange', function(chn, src) {
      if (src === 'edit') {
        
        // call check_cell_change if original and new data differ
        if (chn[0][2] !== chn[0][3]) {
          console.log("differ!");
          chn_copy = chn;
          if (chn_copy[0][3] === null) {
            chn_copy[0][3] = "";
          }
          change_detected = true;

          // remove currently editing state
          current_i = -1;
          current_j = -1;
          currently_editing = false;
        }
      }
    });

    this.hotTableComponent4.current.hotInstance.addHook('afterBeginEditing', function(row, col) {

      // get current chicago time
      const date = new Date();
      begin_edit_time = date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();

      current_i = row;
      current_j = col;
    });

    this.hotTableComponent4.current.hotInstance.addHook('afterSelection', function(row, column, row2, column2, preventScrolling, selectionLayerLevel) {

      // record the currently editing location and state. 
      select_i = row;
      select_j = column;
      after_selection = true;
      currently_editing = true;
    });

    this.hotTableComponent4.current.hotInstance.addHook('afterCreateRow', function(index, amount, source) {
      // get current chicago time
      const date = new Date();
      let curr_time = date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();

      layout_modifications.layout_changed = true;
      layout_modifications.changes.push(["insert_row", index, curr_time, "Dept_emp", current_table[index][0]]); // [action_name, index, curr_time, table_name, primary key]
    });

    this.hotTableComponent4.current.hotInstance.addHook('beforeCreateCol', function(data, coords) {
      return false;
    });

    this.hotTableComponent4.current.hotInstance.addHook('beforeRemoveRow', function(index, amount) {

      // get current chicago time
      const date = new Date();
      let curr_time = date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();

      layout_modifications.layout_changed = true;
      layout_modifications.changes.push(["remove_row", index, curr_time, "Dept_emp", current_table[index][0]]); // [action_name, index, curr_time, table_name, primary key]
    });

    this.hotTableComponent4.current.hotInstance.addHook('beforeRemoveCol', function(index, amount) {
      return false;
    });


    // SIXTH COMPONENT REF ========================================================================================
    this.hotTableComponent5.current.hotInstance.addHook('afterChange', function(chn, src) {
      if (src === 'edit') {
        
        // call check_cell_change if original and new data differ
        if (chn[0][2] !== chn[0][3]) {
          console.log("differ!");
          chn_copy = chn;
          if (chn_copy[0][3] === null) {
            chn_copy[0][3] = "";
          }
          change_detected = true;

          // remove currently editing state
          current_i = -1;
          current_j = -1;
          currently_editing = false;
        }
      }
    });

    this.hotTableComponent5.current.hotInstance.addHook('afterBeginEditing', function(row, col) {

      // get current chicago time
      const date = new Date();
      begin_edit_time = date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();

      current_i = row;
      current_j = col;
    });

    this.hotTableComponent5.current.hotInstance.addHook('afterSelection', function(row, column, row2, column2, preventScrolling, selectionLayerLevel) {

      // record the currently editing location and state. 
      select_i = row;
      select_j = column;
      after_selection = true;
      currently_editing = true;
    });

    this.hotTableComponent5.current.hotInstance.addHook('afterCreateRow', function(index, amount, source) {
      // get current chicago time
      const date = new Date();
      let curr_time = date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();

      layout_modifications.layout_changed = true;
      layout_modifications.changes.push(["insert_row", index, curr_time, "Departments", current_table[index][0]]); // [action_name, index, curr_time, table_name, primary key]
    });

    this.hotTableComponent5.current.hotInstance.addHook('beforeCreateCol', function(data, coords) {
      return false;
    });

    this.hotTableComponent5.current.hotInstance.addHook('beforeRemoveRow', function(index, amount) {

      // get current chicago time
      const date = new Date();
      let curr_time = date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();

      layout_modifications.layout_changed = true;
      layout_modifications.changes.push(["remove_row", index, curr_time, "Departments", current_table[index][0]]); // [action_name, index, curr_time, table_name, primary key]
    });

    this.hotTableComponent5.current.hotInstance.addHook('beforeRemoveCol', function(index, amount) {
      return false;
    });

  }


  componentWillUnmount() {

    const handleResize = (e) => {
      this.setState({ windowWidth: window.innerWidth });
      console.log("window width is: ", this.state.windowWidth);
    };
    window.addEventListener("resize", handleResize);
    this.socket.disconnect();
  }

  toggleLoadErrorModal = () => {
    this.setState({
      isLoadErrorModelOpen: !this.state.isLoadErrorModelOpen
    })
  }

  toggleCompleteConfirmModal = () => {
    this.setState({
      isCompleteConfirmationModalOpen: !this.state.isCompleteConfirmationModalOpen
    })
  }

  toggleRestartModal = () => {
    this.setState({
      isRestartModalOpen: !this.state.isRestartModalOpen
    })
  }

  toggleNameModal = () => {
    this.setState({
      isNameModalOpen: !this.state.isNameModalOpen
    })
  }

  toggleInstructionModal = () => {
      this.setState({
          isInstructionOpen: !this.state.isInstructionOpen
      })
  }

  handleScroll = (e) => {
    const bottom = e.target.scrollHeight - e.target.scrollTop === e.target.clientHeight;
    if (bottom) {
      // this.display()
    }
    prev_scrolltop = e.target.scrollTop;
  }

  check_cell_change = () => {
    if (change_detected) {

      // get current chicago time
      const date = new Date();
      let curr_time = date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();

      // update last and first visible row
      let plugin = "";
      if (this.state.curr_table === "Titles") {
        plugin = this.hotTableComponent.current.hotInstance.getPlugin('AutoRowSize');
      } else if (this.state.curr_table === "Salaries") {
        plugin = this.hotTableComponent1.current.hotInstance.getPlugin('AutoRowSize');
      } else if (this.state.curr_table === "Employees") {
        plugin = this.hotTableComponent2.current.hotInstance.getPlugin('AutoRowSize');
      } else if (this.state.curr_table === "Dept_manager") {
        plugin = this.hotTableComponent3.current.hotInstance.getPlugin('AutoRowSize');
      } else if (this.state.curr_table === "Dept_emp") {
        plugin = this.hotTableComponent4.current.hotInstance.getPlugin('AutoRowSize');
      } else if (this.state.curr_table === "Departments") {
        plugin = this.hotTableComponent5.current.hotInstance.getPlugin('AutoRowSize');
      } 

      // get row and col
      let row = chn_copy[0][0];
      let col = chn_copy[0][1];

      // record user action
      user_actions.push([this.state.name, "update_cell", row, col, begin_edit_time, curr_time, this.state.pageY, this.state.clientY, this.state.curr_table, current_table[row][0], current_table[0][col], "T", plugin.getFirstVisibleRow(), plugin.getLastVisibleRow(), curr_time - last_QA_time]);
      last_QA_time = curr_time;
      
      change_detected = false;
    } else {
      console.log("no changed detected")
    }
  }


  track_action = (e, action_type) => {

    console.log("action type is: ", action_type);

    // get current chicago time
    const date = new Date();
    let curr_time = date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
    console.log("the current second is: ", curr_time);


    // update last and first visible row
    let plugin = "";
    if (this.state.curr_table === "Titles") {
      plugin = this.hotTableComponent.current.hotInstance.getPlugin('AutoRowSize');
    } else if (this.state.curr_table === "Salaries") {
      plugin = this.hotTableComponent1.current.hotInstance.getPlugin('AutoRowSize');
    } else if (this.state.curr_table === "Employees") {
      plugin = this.hotTableComponent2.current.hotInstance.getPlugin('AutoRowSize');
    } else if (this.state.curr_table === "Dept_manager") {
      plugin = this.hotTableComponent3.current.hotInstance.getPlugin('AutoRowSize');
    } else if (this.state.curr_table === "Dept_emp") {
      plugin = this.hotTableComponent4.current.hotInstance.getPlugin('AutoRowSize');
    } else if (this.state.curr_table === "Departments") {
      plugin = this.hotTableComponent5.current.hotInstance.getPlugin('AutoRowSize');
    } 

    // check and update possible spreadsheet layout change
    if (layout_modifications.layout_changed) { 

      // add in all layout changes
      for (var i = 0; i < layout_modifications.changes.length; i++) {
        let action_type = layout_modifications.changes[i][0];
        let index = layout_modifications.changes[i][1];
        let time = layout_modifications.changes[i][2];
        let table_name = layout_modifications.changes[i][3];
        let primary_key = layout_modifications.changes[i][4];

        if (action_type === "insert_row" || action_type === "remove_row") { // [action_name, index, curr_time, table_name, primary key]
          user_actions.push([this.state.name, action_type, index, null , time, time, this.state.pageY, this.state.clientY, table_name, primary_key, null, "T", this.state.firstVisibleRow, this.state.lastVisibleRow, time - last_QA_time]);
          last_QA_time = time;
        } 

      }

      // clear up current layout_modifications recorder
      layout_modifications.layout_changed = false;
    }

    // handle scroll actions
    if (action_type === "scroll") {

      // update the last and first visible rows
      this.setState({
        firstVisibleRow: plugin.getFirstVisibleRow(), 
        lastVisibleRow: plugin.getLastVisibleRow()
      });

      let scroll_diff = prev_scrolltop - e.target.scrollTop;
      let action_length = user_actions.length;

      // don't hace scroll_diff === 0 because each scroll on mouse will result in two identical function calls
      if (scroll_diff > 0) {
        
        // check if previous is a large up scroll. If so, do nothing
        if (action_length >= 1 && user_actions[action_length - 1][1] === "up_scroll_large") {
          // deliberately do nothing here
        }

        // check for combining 6 small up scrolls
        else if (action_length >= SCROLL_SIZE) {
          let combine = true;
          for (var i = 0; i < SCROLL_SIZE; i++) {
              if (user_actions[action_length - 1 - i][1] !== "up_scroll_small") {
                combine = false;
                break;
              }
          }
          
          let last_scroll = "";
          if (combine) {
            for (var i = 0; i < SCROLL_SIZE; i++) {
              last_scroll = user_actions.pop();
            }
            user_actions.push([this.state.name, "up_scroll_large", last_scroll[2], last_scroll[2] - e.target.scrollTop , curr_time, curr_time, this.state.pageY, this.state.clientY, this.state.curr_table, null, null, "F", plugin.getFirstVisibleRow(), plugin.getLastVisibleRow(), curr_time - last_QA_time]);
          }

          else {
            user_actions.push([this.state.name, "up_scroll_small", prev_scrolltop, scroll_diff , curr_time, curr_time, this.state.pageY, this.state.clientY, this.state.curr_table, null, null, "F", plugin.getFirstVisibleRow(), plugin.getLastVisibleRow(), curr_time - last_QA_time]);
          }
        }

        else {
          user_actions.push([this.state.name, "up_scroll_small", prev_scrolltop, scroll_diff , curr_time, curr_time, this.state.pageY, this.state.clientY, this.state.curr_table, null, null, "F", plugin.getFirstVisibleRow(), plugin.getLastVisibleRow(), curr_time - last_QA_time]);
        }

      } else if (scroll_diff < 0) {

        // check if previous is a large down scroll. If so, do nothing
        if (action_length >= 1 && user_actions[action_length - 1][1] === "down_scroll_large") {
            // deliberately do nothing here
        }

        // check for combining 6 small scrolls
        else if (action_length >= SCROLL_SIZE) {
          let combine = true;
          for (var i = 0; i < SCROLL_SIZE; i++) {
              if (user_actions[action_length - 1 - i][1] !== "down_scroll_small") {
                combine = false;
                break;
              }
          }
          
          let last_scroll = "";
          if (combine) {
            for (var i = 0; i < SCROLL_SIZE; i++) {
                user_actions.pop();
            }
            user_actions.push([this.state.name, "down_scroll_large", last_scroll[2], last_scroll[2] - e.target.scrollTop , curr_time, curr_time, this.state.pageY, this.state.clientY, this.state.curr_table, null, null, "F", plugin.getFirstVisibleRow(), plugin.getLastVisibleRow(), curr_time - last_QA_time]);
          }

          else {
            user_actions.push([this.state.name, "down_scroll_small", prev_scrolltop, scroll_diff , curr_time, curr_time, this.state.pageY, this.state.clientY, this.state.curr_table, null, null, "F", plugin.getFirstVisibleRow(), plugin.getLastVisibleRow(), curr_time - last_QA_time]);
          }
        } 

        else {
          user_actions.push([this.state.name, "down_scroll_small", prev_scrolltop, scroll_diff , curr_time, curr_time, this.state.pageY, this.state.clientY, this.state.curr_table, null, null, "F", plugin.getFirstVisibleRow(), plugin.getLastVisibleRow(), curr_time - last_QA_time]);
        }
      }
      this.handleScroll(e);
    }

    else if (action_type === "mouse_down") {
      console.log("on mousedown, clientX:", e.clientX);
      console.log("on mousedown, clientY:", e.clientY);
      console.log("on mousedown, pageY:", e.pageY);
      console.log("on mousedown, pageX:", e.pageX);
      console.log("on mousedown, screenX:", e.screenX);
      console.log("on mousedown, screenY:", e.screenY);
      console.log("=====================================================================");
    }

    // calculate click action
    else if (action_type === "click") {

      // use this to distinguish if the click is on the sheet
      if (after_selection) {
        
        // select a row
        if (select_j < 0) {
          user_actions.push([this.state.name, "select_row", select_i, null , curr_time, curr_time, this.state.pageY, this.state.clientY, this.state.curr_table, current_table[select_i][0], null, "F", plugin.getFirstVisibleRow(), plugin.getLastVisibleRow(), curr_time - last_QA_time]);
        }

        // select a column
        else if (select_i < 0) {
          user_actions.push([this.state.name, "select_col", null, select_j, curr_time, curr_time, this.state.pageY, this.state.clientY, this.state.curr_table, null, current_table[0][select_j], "F", plugin.getFirstVisibleRow(), plugin.getLastVisibleRow(), curr_time - last_QA_time]);
        }
        
        // select a cell
        else {
          user_actions.push([this.state.name, "select_cell", select_i, select_j, curr_time, curr_time, this.state.pageY, this.state.clientY, this.state.curr_table, current_table[select_i][0], current_table[0][select_j], "F", plugin.getFirstVisibleRow(), plugin.getLastVisibleRow(), curr_time - last_QA_time]);
        }
        after_selection = false;

      } else {
        // a click outside of the spreadsheets
        user_actions.push([this.state.name, "click", null, null , curr_time, curr_time, this.state.pageY, this.state.clientY, this.state.curr_table, null, null, "F", plugin.getFirstVisibleRow(), plugin.getLastVisibleRow(), curr_time - last_QA_time]);
      }
      this.check_cell_change();
    }

    // calculate kepress action
    else if (action_type === "key_press") {
      
      if (currently_editing) {
        // handle enter press
        if (e.key === "Enter" && current_table.length !== 0 && current_table[0].length !== 0) {
          let primary_key = null;
          let attribute = null;
          if (select_i >= 0) {
            primary_key = current_table[select_i][0];
          }
          if (select_j >= 0) {
            attribute = current_table[0][select_j];
          }
          user_actions.push([this.state.name, "key_press_enter", select_i, select_j, curr_time, curr_time, this.state.pageY, this.state.clientY, this.state.curr_table, primary_key, attribute, "F", plugin.getFirstVisibleRow(), plugin.getLastVisibleRow(), curr_time - last_QA_time]);
        }

        // handle tab press
        else if (e.key === "Tab" && current_table.length !== 0 && current_table[0].length !== 0) {
          let primary_key = null;
          let attribute = null;
          if (select_i >= 0) {
            primary_key = current_table[select_i][0];
          }
          if (select_j >= 0) {
            attribute = current_table[0][select_j];
          }
          user_actions.push([this.state.name, "key_press_tab", select_i, select_j, curr_time, curr_time, this.state.pageY, this.state.clientY, this.state.curr_table, primary_key, attribute, "F", plugin.getFirstVisibleRow(), plugin.getLastVisibleRow(), curr_time - last_QA_time]);
        }
      }

      this.check_cell_change();
      currently_editing = false;
    }
    console.log(user_actions);
  }

  store_training_data = () => {
    // get current chicago time
    const date = new Date();
    let curr_time = date.toLocaleString('en-US', { timeZone: 'America/Chicago' });
    
    user_actions.push([this.state.name, "END_TRAINING_DATA", null, null, null, this.state.curr_table, null, null, curr_time]);
    let action_package = {
      user_actions: user_actions
    }
    //POST req here
    const requestOptions = {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({action_package})
    };
    fetch('https://spreadsheetactions.herokuapp.com/training/send-training-data/academic', requestOptions,  {mode: 'no-cors'})

    // bring up confirmation modal
    this.toggleCompleteConfirmModal();
  }

  toggle = (tab) => {

    // get current chicago time
    const date = new Date();
    let curr_time = date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();

    // update last and first visible row
    let plugin = "";
    if (this.state.curr_table === "Titles") {
      plugin = this.hotTableComponent.current.hotInstance.getPlugin('AutoRowSize');
    } else if (this.state.curr_table === "Salaries") {
      plugin = this.hotTableComponent1.current.hotInstance.getPlugin('AutoRowSize');
    } else if (this.state.curr_table === "Employees") {
      plugin = this.hotTableComponent2.current.hotInstance.getPlugin('AutoRowSize');
    } else if (this.state.curr_table === "Dept_manager") {
      plugin = this.hotTableComponent3.current.hotInstance.getPlugin('AutoRowSize');
    } else if (this.state.curr_table === "Dept_emp") {
      plugin = this.hotTableComponent4.current.hotInstance.getPlugin('AutoRowSize');
    } else if (this.state.curr_table === "Departments") {
      plugin = this.hotTableComponent5.current.hotInstance.getPlugin('AutoRowSize');
    }

    if (this.state.activeTab !== tab) {
        this.setState({ activeTab: tab });
    }
    let new_table = "";
    if (tab === '1') {  
      this.setState({
        curr_table: "Titles" 
      });
      new_table = "Titles";
      current_table = tables[0];
      
    } else if (tab === '2') {
      this.setState({
        curr_table: "Salaries"
      });
      new_table = "Salaries";
      current_table = tables[1];

    } else if (tab === '3') {
      this.setState({
        curr_table: "Employees"
      });
      new_table = "Employees";
      current_table = tables[2];

    } else if (tab === '4') {
      this.setState({
        curr_table: "Dept_manager"
      });
      new_table = "Dept_manager";
      current_table = tables[3];

    } else if (tab === '5') {
      this.setState({
        curr_table: "Dept_emp"
      });
      new_table = "Dept_emp";
      current_table = tables[4];

    } else if (tab === '6') {
      this.setState({
        curr_table: "Departments"
      });
      new_table = "Departments";
      current_table = tables[5];

    }

    // record select table action
    user_actions.push([this.state.name, "select_table", null, null , curr_time, curr_time, this.state.pageY, this.state.clientY, new_table, null, null, "F", plugin.getFirstVisibleRow(), plugin.getLastVisibleRow(), curr_time - last_QA_time]);

    // update the last and first visible rows upon switching tables
    this.setState({
      firstVisibleRow: plugin.getFirstVisibleRow(), 
      lastVisibleRow: plugin.getLastVisibleRow()
    });
  }

  load_tables = (e) => {
    e.preventDefault();
    if (table_loaded) {
      this.toggleInstructionModal();
    } else {
      table_loaded = true;
      utils.load_employees_tables(employees_schema, tables);
      setTimeout(() => {
          current_table = tables[0];
          this.setState({
            isInstructionOpen: false
          })
      }, 1500);
      this.setState({
        isNameModalOpen: true
      })
    }
  }


  onNameSubmit = (e) => {
    this.setState({
        [e.target.name]: e.target.value
    })
  }

  submitName = (e) => {
    e.preventDefault();
    console.log("state name is: ", this.state.name);

    let name_package = {
      user_name: this.state.name,
      simulation: "academic"
    }
    this.socket.emit('SEND_USERNAME', name_package);
    this.toggleNameModal();

    // handle load error that happens the FIRST time loading the table
    if (load_error[0][0] === 1) {
      this.setState({
        isLoadErrorModelOpen: true
      });
    }
  }

  restart = (reset_user_actions) => {
    // need to finish
  }

  close_restart_comfirmation = () => {
    setTimeout(() => {
      this.setState({
        isRestartModalOpen: false
      });

      // handle load error that happens during restart
      if (load_error[0][0] === 1) {
        this.setState({
          isLoadErrorModelOpen: true
        });
      }
    }, 2000);
  }

  close_confirmation = () => {
    user_actions = []
    this.toggleCompleteConfirmModal();
  }


  indicate_error = () => {
    user_actions.push([this.state.name, "ERR", "ERR", "ERR", "ERR", "ERR", "ERR", "ERR", "ERR"]);
    console.log("the pending changes are: ", pending_changes.data)
  }

  track_mouse = (e) => {
      this.setState({
        clientX: e.clientX,
        clientY: e.clientY,
        pageX: e.pageX,
        pageY: e.pageY
      });
  }

  render() {
    return (
      // onClick={e => this.track_action(e, "click")}
      <div onClick={e => this.track_action(e, "click")} onMouseMove={e => this.track_mouse(e)} onKeyUp={e => this.track_action(e, "key_press")} className="App">
        <script src="node_modules/handsontable/dist/handsontable.full.min.js"></script>
        <link href="node_modules/handsontable/dist/handsontable.full.min.css" rel="stylesheet" media="screen"></link>
        <hr />
        <div>
        <Jumbotron >
                  {this.state.user_text_block}
                  <p className="lead">
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                    <Button size='lg' className='display-button' color="info" onClick={this.store_training_data} >Submit Simulation</Button>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                    <Button size='lg' className='display-button' color="info" onClick={e => this.restart(false)} >Refresh</Button>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                    <Button size='lg' className='display-button' color="info" onClick={this.indicate_error} >Alert</Button>
                  </p>
                  {this.state.edit_message}
            </Jumbotron>
        <Modal size='lg' isOpen={this.state.isInstructionOpen} >
                    <ModalBody>
                        <h2>Welcome</h2>
                        Welcome to Academic Simulation! This instruction can be accessed at any time by clicking the "Instruction" button on this webpage. 
                        Under this simulation, there are three tables: "Attendance" table, "Gradebook" table, and a "Student Status" table. This simulation has two parts.  
                        <hr className="my-2" />

                    </ModalBody>
                    <ModalFooter>
                        <Button size='lg' className='display-button' color="info" onClick={this.load_tables}>Got it!</Button>
                    </ModalFooter>
                  </Modal>

                  
                  <Modal size='lg' isOpen={this.state.isNameModalOpen} toggle={this.toggleNameModal}>
                    <ModalHeader toggle={this.toggleNameModal}>Please Enter Your Full Name</ModalHeader>
                    <ModalBody>
                      <Form onSubmit={this.submitName}>
                        <FormGroup>
                          <Label for="user_name">Enter Full Name</Label>
                          <Input type="text" name="name" id="name" onChange={e => this.onNameSubmit(e)} />
                        </FormGroup>
                        <Button size='lg' color="primary" className='single_search_submit' type="submit" >Confirm</Button> {' '}
                      </Form>
                    </ModalBody>
                  </Modal>

                  <Modal size='lg' isOpen={this.state.isRestartModalOpen} toggle={this.toggleRestartModal}>
                    <ModalHeader toggle={this.toggleRestartModal}>Restart/Reload Confirmation</ModalHeader>
                    <ModalBody>
                      Your simulation has been restarted/reloaded.
                    </ModalBody>
                    <ModalFooter>
                      <Button size='lg' className='display-button' color="info" onClick={this.close_restart_comfirmation}>Got It</Button>
                    </ModalFooter>
                  </Modal>

        
        <Nav tabs>
            <NavItem>
                <NavLink
                    className={classnames({ active: this.state.activeTab === '1' })}
                    onClick={() => { this.toggle('1'); }}>
                    Titles
                </NavLink>
            </NavItem>
            <NavItem>
                <NavLink
                    className={classnames({ active: this.state.activeTab === '2' })}
                    onClick={() => { this.toggle('2'); }}>
                    Salaries
                </NavLink>
            </NavItem>
            <NavItem>
                <NavLink
                    className={classnames({ active: this.state.activeTab === '3' })}
                    onClick={() => { this.toggle('3'); }}>
                    Employees
                </NavLink>
            </NavItem>
            <NavItem>
                <NavLink
                    className={classnames({ active: this.state.activeTab === '4' })}
                    onClick={() => { this.toggle('4'); }}>
                    Dept_manager
                </NavLink>
            </NavItem>
            <NavItem>
                <NavLink
                    className={classnames({ active: this.state.activeTab === '5' })}
                    onClick={() => { this.toggle('5'); }}>
                    Dept_emp
                </NavLink>
            </NavItem>

            <NavItem>
                <NavLink
                    className={classnames({ active: this.state.activeTab === '6' })}
                    onClick={() => { this.toggle('6'); }}>
                    Departments
                </NavLink>
            </NavItem>
        </Nav>
        <TabContent activeTab={this.state.activeTab}>
            <TabPane tabId="1">
                {/* onScrollCapture={e => this.track_action(e, "scroll")} */}
                <div id = "display_portion" onScrollCapture={e => this.track_action(e, "scroll")} tabIndex="1">
                    <HotTable className="handsontable" id ="display_table" data={tables[0]} ref={this.hotTableComponent} id={this.id}
                        colHeaders={true} 
                        rowHeaders={true} 
                        width="100%" 
                        height="600"
                        // colWidths="100%"
                        rowHeights="25"
                        contextMenu={true}
                        formulas={true}
                        readOnly={false}
                    />
                </div>
                    
            </TabPane>
            <TabPane tabId="2">
                <h4>
                    Salaries
                </h4> 
                <div id = "display_portion" onScrollCapture={e => this.track_action(e, "scroll")} tabIndex="2">
                    <HotTable className="handsontable" id ="display_table" data={tables[1]} ref={this.hotTableComponent1} id={this.id}
                        colHeaders={true} 
                        rowHeaders={true} 
                        width="100%" 
                        height="600"
                        // colWidths="100%"
                        rowHeights="25"
                        contextMenu={true}
                        formulas={true}
                        readOnly={false}
                    />
                </div>
                    
            </TabPane>
            <TabPane tabId="3">
                <h4>
                    Employees
                </h4> 
                <div id = "display_portion" onScrollCapture={e => this.track_action(e, "scroll")} tabIndex="3">
                    <HotTable className="handsontable" id ="display_table" data={tables[2]} ref={this.hotTableComponent2} id={this.id}
                        colHeaders={true} 
                        rowHeaders={true} 
                        width="100%" 
                        height="600"
                        // colWidths="100%"
                        rowHeights="25"
                        contextMenu={true}
                        formulas={true}
                        readOnly={false}
                    />
                </div>
                    
            </TabPane>
            <TabPane tabId="4">
                <h4>
                    Department Manager
                </h4> 
                <div id = "display_portion" onScrollCapture={e => this.track_action(e, "scroll")} tabIndex="4">
                    <HotTable className="handsontable" id ="display_table" data={tables[3]} ref={this.hotTableComponent3} id={this.id}
                        colHeaders={true} 
                        rowHeaders={true} 
                        width="100%" 
                        height="600"
                        // colWidths="100%"
                        rowHeights="25"
                        contextMenu={true}
                        formulas={true}
                        readOnly={false}
                    />
                </div>
                    
            </TabPane>
            <TabPane tabId="5">
                <h4>
                    Department Employees
                </h4> 
                <div id = "display_portion" onScrollCapture={e => this.track_action(e, "scroll")} tabIndex="5">
                    <HotTable className="handsontable" id ="display_table" data={tables[4]} ref={this.hotTableComponent4} id={this.id}
                        colHeaders={true} 
                        rowHeaders={true} 
                        width="100%" 
                        height="600"
                        // colWidths="100%"
                        rowHeights="25"
                        contextMenu={true}
                        formulas={true}
                        readOnly={false}
                    />
                </div>
                    
            </TabPane>

            <TabPane tabId="6">
                <h4>
                    Departments
                </h4> 
                <div id = "display_portion" onScrollCapture={e => this.track_action(e, "scroll")} tabIndex="6">
                    <HotTable className="handsontable" id ="display_table" data={tables[5]} ref={this.hotTableComponent5} id={this.id}
                        colHeaders={true} 
                        rowHeaders={true} 
                        width="100%" 
                        height="600"
                        // colWidths="100%"
                        rowHeights="25"
                        contextMenu={true}
                        formulas={true}
                        readOnly={false}
                    />
                </div>
                    
            </TabPane>
        </TabContent>
        </div>
          
      </div>

    );
  }
}
export default Employees;
