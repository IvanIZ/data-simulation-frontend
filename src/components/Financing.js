import React, { Component, useState } from 'react';
import ReactDOM from "react-dom"
import { HotTable } from '@handsontable/react';
// import Handsontable from 'handsontable';
import 'handsontable/dist/handsontable.full.css';
import '../App.css';
import {
  Navbar,
  Row,
  Col,
  Jumbotron,
  Nav,
  NavItem,
  NavLink,
  Button,
  Modal, ModalHeader, ModalFooter, ModalBody, Form, FormGroup, Label, Input, TabContent, TabPane, ButtonDropdown, Dropdown, DropdownToggle, DropdownMenu, DropdownItem
} from 'reactstrap';
import {
  BrowserRouter as Router,
  Route,
  Link,
  Redirect
} from "react-router-dom";
import classnames from 'classnames';
import io from "socket.io-client";

const Utils = require('../utils');
let utils = new Utils();

let monthly_expense_display = [];
let monthly_income_display = [];
let check_book_display = [];
let check_book2_display = [];
let check_book3_display = [];
let allowance_display = [];
let table_loaded = false;

let in_transaction = false;

let simulation_type = "";

// A JSON object that keeps track of previous layout changes
let layout_changes = {
  incoming: false,
  layout_changed: false,
  changes: [], // 1st element: action;  2nd element: index
  start_idx: 0, 
  socketID: ""
}

let col_headers = []
let monthly_expense_col_headers = [];
let monthly_income_col_headers = [];
let check_book_col_headers = [];
let check_book2_col_headers = [];
let check_book3_col_headers = [];
let allowance_col_headers = [];

let user_actions = []

let SCROLL_SIZE = 5;

let data = [], dataMatrix = [], columns = [], buffer = [], buffer_copy = [];
let load_error = [[0]];
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

let socket_id = "";

let pending_changes = {
  data:[], // 2d array to store difference: y, value, x, 
  try_message: "SENT MESSAGE! SUCCESS!", 
  socketID: "",
  user: "", 
  incoming: false
}

class Financing extends Component {

  constructor() {
    super();
    this.id = "hot";
    this.hotTableComponent = React.createRef();
    this.hotTableComponent1 = React.createRef();
    this.hotTableComponent2 = React.createRef();
    this.hotTableComponent3 = React.createRef();
    this.hotTableComponent4 = React.createRef();
    this.state = {
      collapsed: false,
      items: Array.from({ length: 0 }),
      hasMore: false,
      load_from_buffer_to_matrix: false, 

      //retrieval display variables
      hasMoreResult: false,
      resultItems: Array.from({ length: 0 }), 
      load_result_from_buffer_to_matrix: false, 

      import_page_link: '/result', 

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

      transaction_mode: false, 
      isSharedLockRejectOpen: false,
      isExclusiveLockRejectOpen: false, 

      isInstructionOpen: true,
      activeTab: '1', 

      redirect_link: "", 
      isRedirectConfirmOpen: false, 
      redirect: false, 

      isRestartModalOpen: false, 
      isNameModalOpen: false, 

      isCompleteConfirmationModalOpen: false, 
      name: "", 
      curr_table: "monthly_expense", 

      isLoadErrorModelOpen: false
    }

    // Socket io stuff =========================================================================================

    this.socket = io('https://spreadsheetactions.herokuapp.com/');
    // this.socket = io('localhost:3001');

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

    // update the last edit message, as well as the entire edit history
    this.socket.on('UPDATE_EDIT_MESSAGE', function(message_package) {
      update_edit_message(message_package);
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
      if (data.simulation === "financing") {

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

    const update_edit_message = message_package => {
      this.setState({
        edit_message: message_package.new_message, 
        history: message_package.history
      })
    }

    this.toggleSelectionPrompt = this.toggleSelectionPrompt.bind()
    this.toggleNavbar = this.toggleNavbar.bind()
    this.toggleInstructionModal = this.toggleInstructionModal.bind();
    this.toggleNameModal = this.toggleNameModal.bind();
    this.toggleRestartModal = this.toggleRestartModal.bind();
    this.toggleCompleteConfirmModal = this.toggleCompleteConfirmModal.bind();
    this.toggleLoadErrorModal = this.toggleLoadErrorModal.bind();
  }

  // fetch 50 rows of data into the buffer
  async componentDidMount() {

    // receive updates on spreadsheet from other users
    this.socket.on('RECEIVE_MESSAGE', function(data){
      addMessage(data);
    });

    const addMessage = data => {
      // ignore if these actions come from this user itself
      if (data.socketID === socket_id) {
        return;
      }

      let change_table = data.data
      for (var x = 0; x < change_table.length; x++) {

        // [table_name, change_type, update_value, update_attribute, search_attribute1, search_attribute2, y_coord, x_coord] for cell changes
        // [table_name, change_type, operation, direction, search_attribute, socket_id] for remove row
        // [table_name, change_type, operation, value, search_attribute, socket_id] for insert row
        if (change_table[x][1] === "layout_change") {
          if (change_table[x][5] === socket_id) {
            continue;
          } else {
            process_layout_changes(change_table[x]);
            continue;
          }
        }

        // Extract data
        let table = change_table[x][0]; // table corresponds to this change  
        let value = change_table[x][2] // 1 --> actual value

        // reflect each update to its corresponding table
        try { // [table_name, change_type, update_value, update_attribute, search_attribute1, search_attribute2, y_coord, x_coord] for cell changes
          let x_coord = change_table[x][7];

          if (table === "monthly_expense") {
            for (var i = 0; i < monthly_expense_display.length; i++) {
              if ((monthly_expense_display[i][0] === change_table[x][4] && change_table[x][4] !== "") || (monthly_expense_display[i][1] === change_table[x][5] && change_table[x][5] !== "")) {
                monthly_expense_display[i][x_coord] = value;
              }
            }
            
          } else if (table === "check_book") {
            for (var i = 0; i < check_book_display.length; i++) {
              if ((check_book_display[i][0] === change_table[x][4] && change_table[x][4] !== "") || (check_book_display[i][1] === change_table[x][5] && change_table[x][5] !== "")) {
                check_book_display[i][x_coord] = value;
              }
            }
            
          } else if (table === "check_book2") {
            for (var i = 0; i < check_book2_display.length; i++) {
              if ((check_book2_display[i][0] === change_table[x][4] && change_table[x][4] !== "") || (check_book2_display[i][1] === change_table[x][5] && change_table[x][5] !== "")) {
                check_book2_display[i][x_coord] = value;
              }
            }
            
          } else if (table === "check_book3") {
            for (var i = 0; i < check_book3_display.length; i++) {
              if ((check_book3_display[i][0] === change_table[x][4] && change_table[x][4] !== "") || (check_book3_display[i][1] === change_table[x][5] && change_table[x][5] !== "")) {
                check_book3_display[i][x_coord] = value;
              }
            }
            
          } else if (table === "allowance") {
            for (var i = 0; i < allowance_display.length; i++) {
              if ((allowance_display[i][0] === change_table[x][4] && change_table[x][4] !== "") || (allowance_display[i][1] === change_table[x][5] && change_table[x][5] !== "")) {
                allowance_display[i][x_coord] = value;
              }
            }
            
          }
        } catch (error) {
          console.log(error);
        }
      }
    };

    const process_layout_changes = curr_changes => {
      console.log("the new layout change is: ", curr_changes);
      // [table_name, change_type, operation, direction, search_attribute, socket_id] for remove row
      // [table_name, change_type, operation, value, search_attribute, socket_id, y_coord] for insert row

      // get the current table for current change to process
      let table_instance = "";
      let table = "";
      let headers = "";
      if (curr_changes[0] === "monthly_expense") {
        table_instance = this.hotTableComponent.current.hotInstance;
        table = monthly_expense_display;
        headers = monthly_expense_col_headers;
      } else if (curr_changes[0] === "check_book") {
        table_instance = this.hotTableComponent1.current.hotInstance;
        table = check_book_display;
        headers = check_book_col_headers;
      } else if (curr_changes[0] === "check_book2") {
        table_instance = this.hotTableComponent2.current.hotInstance;
        table = check_book2_display;
        headers = check_book2_col_headers;
      } else if (curr_changes[0] === "check_book3") {
        table_instance = this.hotTableComponent3.current.hotInstance;
        table = check_book3_display;
        headers = check_book3_col_headers;
      } else if (curr_changes[0] === "allowance") {
        table_instance = this.hotTableComponent4.current.hotInstance;
        table = allowance_display;
        headers = allowance_col_headers;
      }

      if (curr_changes[2] === "remove_r") {
        // search for the row to delete
        for (var index = 0; index < table.length; index++) {
          if (table[index][0] === curr_changes[4]) {
            pending_changes.incoming = true;
            layout_changes.incoming = true;
            table_instance.alter('remove_row', index, 1);
            break;
          }
        }

      } else if (curr_changes[2] === "insert_r") {

        // find the column for writing in the first value
        for (var j = 0; j < headers.length; j++) {
          if (headers[j] === curr_changes[4]) {
            table[curr_changes[6]][j] = curr_changes[3];
          }
        }
      }
    }

    transaction_button = <Button size='lg' className='display-button' color="primary" onClick={this.start_transaction} >Start Transaction</Button>

    // FIRST COMPONENT REF ========================================================================================
    this.hotTableComponent.current.hotInstance.addHook('afterChange', function(chn, src) {
      if (src === 'edit') {
        console.log(chn);

        try {
          // call check_cell_change if original and new data differ
          if (chn[0][2] !== chn[0][3] && (chn[0][3] === null || (chn[0][3].charAt(0) !== "*" && chn[0][3] !== "-----") )) {
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
        catch (err) {
          console.log(err);
        }
      }
    });

    this.hotTableComponent.current.hotInstance.addHook('afterBeginEditing', function(row, col) {

      // record the currently editing location and state. 
      current_i = row;
      current_j = col;
    });

    this.hotTableComponent.current.hotInstance.addHook('afterSelection', function(row, column, row2, column2, preventScrolling, selectionLayerLevel) {

      // record the currently editing location and state. 
      select_i = row;
      select_j = column;
      currently_editing = true;
    });

    this.hotTableComponent.current.hotInstance.addHook('beforeCreateRow', function(data, coords) {
      return false;
    });

    this.hotTableComponent.current.hotInstance.addHook('afterCreateRow', function(index, amount, source) {
      if (layout_changes.incoming === true) {
        layout_changes.incoming = false
      } else {
        if (source === "ContextMenu.rowBelow") {
          layout_changes.layout_changed = true;
          layout_changes.changes.push(["insert_r", "below", index, "monthly_expense"]);
        } else {
          layout_changes.layout_changed = true;
          layout_changes.changes.push(["insert_r", "above", index, "monthly_expense"]);
        }
      }
    });

    this.hotTableComponent.current.hotInstance.addHook('beforeCreateCol', function(data, coords) {
      return false;
    });

    this.hotTableComponent.current.hotInstance.addHook('afterCreateCol', function(index, amount, source) {
      if (layout_changes.incoming === true) {
        layout_changes.incoming = false;
      } else {
        if (source === "ContextMenu.columnRight") {
          layout_changes.layout_changed = true;
          layout_changes.changes.push(["insert_c", "right", index, "monthly_expense"]);
        } else {
          layout_changes.layout_changed = true;
          layout_changes.changes.push(["insert_c", "left", index, "monthly_expense"]);
        }
      }
    });

    this.hotTableComponent.current.hotInstance.addHook('beforeRemoveRow', function(index, amount) {
      // prevent remove row if not in a transaction
      if (!in_transaction) {
        return false;
      }

      // [table_name, change_type, operation, direction, search_attribute]
      if (pending_changes.incoming === true) {
        pending_changes.incoming = false;
      } else {
        let temp = []
        temp[0] = "monthly_expense";
        temp[1] = "layout_change";
        temp[2] = "remove_r";
        temp[3] = null;
        temp[4] = monthly_expense_display[index][0];
        temp[5] = socket_id;
        pending_changes.data.push(temp);
      }
    });

    this.hotTableComponent.current.hotInstance.addHook('afterRemoveRow', function(index, amount, physicalRows, source) {
      console.log("after remove row index: ", index);
      if (layout_changes.incoming === true) {
        layout_changes.incoming = false;
      } else {
        layout_changes.layout_changed = true;
        layout_changes.changes.push(["remove_r", null, index, "monthly_expense"]);
      }
    });

    this.hotTableComponent.current.hotInstance.addHook('beforeRemoveCol', function(index, amount) {
      return false;
    });

    this.hotTableComponent.current.hotInstance.addHook('afterRemoveCol', function(index, amount, physicalRows, source) {
      if (layout_changes.incoming === true) {
        layout_changes.incoming = false;
      } else {
        layout_changes.layout_changed = true;
        layout_changes.changes.push(["remove_c", null, index, "monthly_expense"]);
      }
    });

    // SECOND COMPONENT REF ========================================================================================
    this.hotTableComponent1.current.hotInstance.addHook('afterChange', function(chn, src) {
      if (src === 'edit') {
        console.log(chn);
        
        try {
          // call check_cell_change if original and new data differ
          if (chn[0][2] !== chn[0][3] && (chn[0][3] === null || (chn[0][3].charAt(0) !== "*" && chn[0][3] !== "-----") )) {
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
        catch (err) {
          console.log(err)
        }
      }
    });

    this.hotTableComponent1.current.hotInstance.addHook('afterBeginEditing', function(row, col) {

      // record the currently editing location and state. 
      current_i = row;
      current_j = col;
    });

    this.hotTableComponent1.current.hotInstance.addHook('afterSelection', function(row, column, row2, column2, preventScrolling, selectionLayerLevel) {

      // record the currently editing location and state. 
      select_i = row;
      select_j = column;
      currently_editing = true;
    });

    this.hotTableComponent1.current.hotInstance.addHook('beforeCreateRow', function(data, coords) {
      return false;
    });

    this.hotTableComponent1.current.hotInstance.addHook('afterCreateRow', function(index, amount, source) {
      if (layout_changes.incoming === true) {
        layout_changes.incoming = false;
      } else {
        if (source === "ContextMenu.rowBelow") {
          layout_changes.layout_changed = true;
          layout_changes.changes.push(["insert_r", "below", index, "check_book"]);
        } else {
          layout_changes.layout_changed = true;
          layout_changes.changes.push(["insert_r", "above", index, "check_book"]);
        }
      }
    });

    this.hotTableComponent1.current.hotInstance.addHook('beforeCreateCol', function(data, coords) {
      return false;
    });

    this.hotTableComponent1.current.hotInstance.addHook('afterCreateCol', function(index, amount, source) {
      if (layout_changes.incoming === true) {
        layout_changes.incoming = false;
      } else {
        if (source === "ContextMenu.columnRight") {
          layout_changes.layout_changed = true;
          layout_changes.changes.push(["insert_c", "right", index, "check_book"]);
        } else {
          layout_changes.layout_changed = true;
          layout_changes.changes.push(["insert_c", "left", index, "check_book"]);
        }
      }
    });

    this.hotTableComponent1.current.hotInstance.addHook('beforeRemoveRow', function(index, amount) {
      // prevent remove row if not in a transaction
      if (!in_transaction) {
        return false;
      }

      // [table_name, change_type, operation, direction, search_attribute]
      if (pending_changes.incoming === true) {
        pending_changes.incoming = false;
      } else {
        let temp = []
        temp[0] = "check_book";
        temp[1] = "layout_change";
        temp[2] = "remove_r";
        temp[3] = null;
        temp[4] = check_book_display[index][0];
        temp[5] = socket_id;
        pending_changes.data.push(temp);
      }
    });

    this.hotTableComponent1.current.hotInstance.addHook('afterRemoveRow', function(index, amount, physicalRows, source) {
      if (layout_changes.incoming === true) {
        layout_changes.incoming = false;
      } else {
        layout_changes.layout_changed = true;
        layout_changes.changes.push(["remove_r", null, index, "check_book"]);
      }
    });

    this.hotTableComponent1.current.hotInstance.addHook('beforeRemoveCol', function(index, amount) {
      return false;
    });

    this.hotTableComponent1.current.hotInstance.addHook('afterRemoveCol', function(index, amount, physicalRows, source) {
      if (layout_changes.incoming === true) {
        layout_changes.incoming = false;
      } else {
        layout_changes.layout_changed = true;
        layout_changes.changes.push(["remove_c", null, index, "check_book"]);
      }
    });

    // THIRD COMPONENT REF ========================================================================================
    this.hotTableComponent2.current.hotInstance.addHook('afterChange', function(chn, src) {
      if (src === 'edit') {
        console.log(chn);

        try {
          // call check_cell_change if original and new data differ
          if (chn[0][2] !== chn[0][3] && (chn[0][3] === null || (chn[0][3].charAt(0) !== "*" && chn[0][3] !== "-----") )) {
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
        catch (err) {
          console.log(err);
        }
      }
    });

    this.hotTableComponent2.current.hotInstance.addHook('afterBeginEditing', function(row, col) {

      // record the currently editing location and state. 
      current_i = row;
      current_j = col;
    });

    this.hotTableComponent2.current.hotInstance.addHook('afterSelection', function(row, column, row2, column2, preventScrolling, selectionLayerLevel) {

      // record the currently editing location and state. 
      select_i = row;
      select_j = column;
      currently_editing = true;
    });

    this.hotTableComponent2.current.hotInstance.addHook('beforeCreateRow', function(data, coords) {
      return false;
    });

    this.hotTableComponent2.current.hotInstance.addHook('afterCreateRow', function(index, amount, source) {
      if (layout_changes.incoming === true) {
        layout_changes.incoming = false;
      } else {
        if (source === "ContextMenu.rowBelow") {
          layout_changes.layout_changed = true;
          layout_changes.changes.push(["insert_r", "below", index, "check_book2"]);
        } else {
          layout_changes.layout_changed = true;
          layout_changes.changes.push(["insert_r", "above", index, "check_book2"]);
        }
      }
    });

    this.hotTableComponent2.current.hotInstance.addHook('beforeCreateCol', function(data, coords) {
      return false;
    });

    this.hotTableComponent2.current.hotInstance.addHook('afterCreateCol', function(index, amount, source) {
      if (layout_changes.incoming === true) {
        layout_changes.incoming = false;
      } else {
        if (source === "ContextMenu.columnRight") {
          layout_changes.layout_changed = true;
          layout_changes.changes.push(["insert_c", "right", index, "check_book2"]);
        } else {
          layout_changes.layout_changed = true;
          layout_changes.changes.push(["insert_c", "left", index, "check_book2"]);
        }
      }
    });

    this.hotTableComponent2.current.hotInstance.addHook('beforeRemoveRow', function(index, amount) {
      // prevent remove row if not in a transaction
      if (!in_transaction) {
        return false;
      }

      // [table_name, change_type, operation, direction, search_attribute]
      if (pending_changes.incoming === true) {
        pending_changes.incoming = false;
      } else {
        let temp = []
        temp[0] = "check_book2";
        temp[1] = "layout_change";
        temp[2] = "remove_r";
        temp[3] = null;
        temp[4] = check_book2_display[index][0];
        temp[5] = socket_id;
        pending_changes.data.push(temp);
      }
    });

    this.hotTableComponent2.current.hotInstance.addHook('afterRemoveRow', function(index, amount, physicalRows, source) {
      if (layout_changes.incoming === true) {
        layout_changes.incoming = false;
      } else {
        layout_changes.layout_changed = true;
        layout_changes.changes.push(["remove_r", null, index, "check_book2"]);
      }
    });

    this.hotTableComponent2.current.hotInstance.addHook('beforeRemoveCol', function(index, amount) {
      return false;
    });

    this.hotTableComponent2.current.hotInstance.addHook('afterRemoveCol', function(index, amount, physicalRows, source) {
      if (layout_changes.incoming === true) {
        layout_changes.incoming = false;
      } else {
        layout_changes.layout_changed = true;
        layout_changes.changes.push(["remove_c", null, index, "check_book2"]);
      }
    });

    // FOURTH COMPONENT REF ========================================================================================
    this.hotTableComponent3.current.hotInstance.addHook('afterChange', function(chn, src) {
      if (src === 'edit') {
        console.log(chn);
        
        try {
          // call check_cell_change if original and new data differ
          if (chn[0][2] !== chn[0][3] && (chn[0][3] === null || (chn[0][3].charAt(0) !== "*" && chn[0][3] !== "-----") )) {
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
        catch (err) {
          console.log(err);
        }
      }
    });

    this.hotTableComponent3.current.hotInstance.addHook('afterBeginEditing', function(row, col) {

      // record the currently editing location and state. 
      current_i = row;
      current_j = col;
    });

    this.hotTableComponent3.current.hotInstance.addHook('afterSelection', function(row, column, row2, column2, preventScrolling, selectionLayerLevel) {

      // record the currently editing location and state. 
      select_i = row;
      select_j = column;
      currently_editing = true;
    });

    this.hotTableComponent3.current.hotInstance.addHook('beforeCreateRow', function(data, coords) {
      return false;
    });

    this.hotTableComponent3.current.hotInstance.addHook('afterCreateRow', function(index, amount, source) {
      if (layout_changes.incoming === true) {
        layout_changes.incoming = false;
      } else {
        if (source === "ContextMenu.rowBelow") {
          layout_changes.layout_changed = true;
          layout_changes.changes.push(["insert_r", "below", index, "check_book3"]);
        } else {
          layout_changes.layout_changed = true;
          layout_changes.changes.push(["insert_r", "above", index, "check_book3"]);
        }
      }
    });

    this.hotTableComponent3.current.hotInstance.addHook('beforeCreateCol', function(data, coords) {
      return false;
    });

    this.hotTableComponent3.current.hotInstance.addHook('afterCreateCol', function(index, amount, source) {
      if (layout_changes.incoming === true) {
        layout_changes.incoming = false;
      } else {
        if (source === "ContextMenu.columnRight") {
          layout_changes.layout_changed = true;
          layout_changes.changes.push(["insert_c", "right", index, "check_book3"]);
        } else {
          layout_changes.layout_changed = true;
          layout_changes.changes.push(["insert_c", "left", index, "check_book3"]);
        }
      }
    });

    this.hotTableComponent3.current.hotInstance.addHook('beforeRemoveRow', function(index, amount) {
      // prevent remove row if not in a transaction
      if (!in_transaction) {
        return false;
      }

      // [table_name, change_type, operation, direction, search_attribute]
      if (pending_changes.incoming === true) {
        pending_changes.incoming = false;
      } else {
        let temp = []
        temp[0] = "check_book3";
        temp[1] = "layout_change";
        temp[2] = "remove_r";
        temp[3] = null;
        temp[4] = check_book3_display[index][0];
        temp[5] = socket_id;
        pending_changes.data.push(temp);
      }
    });

    this.hotTableComponent3.current.hotInstance.addHook('afterRemoveRow', function(index, amount, physicalRows, source) {
      if (layout_changes.incoming === true) {
        layout_changes.incoming = false;
      } else {
        layout_changes.layout_changed = true;
        layout_changes.changes.push(["remove_r", null, index, "check_book3"]);
      }
    });

    this.hotTableComponent3.current.hotInstance.addHook('beforeRemoveCol', function(index, amount) {
      return false;
    });

    this.hotTableComponent3.current.hotInstance.addHook('afterRemoveCol', function(index, amount, physicalRows, source) {
      if (layout_changes.incoming === true) {
        layout_changes.incoming = false;
      } else {
        layout_changes.layout_changed = true;
        layout_changes.changes.push(["remove_c", null, index, "check_book3"]);
      }
    });

    // FIFTH COMPONENT REF ========================================================================================
    this.hotTableComponent4.current.hotInstance.addHook('afterChange', function(chn, src) {
      if (src === 'edit') {
        console.log(chn);
        
        try {
          // call check_cell_change if original and new data differ
          if (chn[0][2] !== chn[0][3] && (chn[0][3] === null || (chn[0][3].charAt(0) !== "*" && chn[0][3] !== "-----") )) {
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
        catch (err) {
          console.log(err);
        }
      }
    });

    this.hotTableComponent4.current.hotInstance.addHook('afterBeginEditing', function(row, col) {

      // record the currently editing location and state. 
      current_i = row;
      current_j = col;
    });

    this.hotTableComponent4.current.hotInstance.addHook('afterSelection', function(row, column, row2, column2, preventScrolling, selectionLayerLevel) {

      // record the currently editing location and state. 
      select_i = row;
      select_j = column;
      currently_editing = true;
    });

    this.hotTableComponent4.current.hotInstance.addHook('beforeCreateRow', function(data, coords) {
      return false;
    });

    this.hotTableComponent4.current.hotInstance.addHook('afterCreateRow', function(index, amount, source) {
      if (layout_changes.incoming === true) {
        layout_changes.incoming = false;
      } else {
        if (source === "ContextMenu.rowBelow") {
          layout_changes.layout_changed = true;
          layout_changes.changes.push(["insert_r", "below", index, "allowance"]);
        } else {
          layout_changes.layout_changed = true;
          layout_changes.changes.push(["insert_r", "above", index, "allowance"]);
        }
      }
    });

    this.hotTableComponent4.current.hotInstance.addHook('beforeCreateCol', function(data, coords) {
      return false;
    });

    this.hotTableComponent4.current.hotInstance.addHook('afterCreateCol', function(index, amount, source) {
      if (layout_changes.incoming === true) {
        layout_changes.incoming = false;
      } else {
        if (source === "ContextMenu.columnRight") {
          layout_changes.layout_changed = true;
          layout_changes.changes.push(["insert_c", "right", index, "allowance"]);
        } else {
          layout_changes.layout_changed = true;
          layout_changes.changes.push(["insert_c", "left", index, "allowance"]);
        }
      }
    });

    this.hotTableComponent4.current.hotInstance.addHook('beforeRemoveRow', function(index, amount) {
      // prevent remove row if not in a transaction
      if (!in_transaction) {
        return false;
      }

      // [table_name, change_type, operation, direction, search_attribute]
      if (pending_changes.incoming === true) {
        pending_changes.incoming = false;
      } else {
        let temp = []
        temp[0] = "allowance";
        temp[1] = "layout_change";
        temp[2] = "remove_r";
        temp[3] = null;
        temp[4] = allowance_display[index][0];
        temp[5] = socket_id;
        pending_changes.data.push(temp);
      }
    });

    this.hotTableComponent4.current.hotInstance.addHook('afterRemoveRow', function(index, amount, physicalRows, source) {
      if (layout_changes.incoming === true) {
        layout_changes.incoming = false;
      } else {
        layout_changes.layout_changed = true;
        layout_changes.changes.push(["remove_r", null, index, "allowance"]);
      }
    });

    this.hotTableComponent4.current.hotInstance.addHook('beforeRemoveCol', function(index, amount) {
      return false;
    });

    this.hotTableComponent4.current.hotInstance.addHook('afterRemoveCol', function(index, amount, physicalRows, source) {
      if (layout_changes.incoming === true) {
        layout_changes.incoming = false;
      } else {
        layout_changes.layout_changed = true;
        layout_changes.changes.push(["remove_c", null, index, "allowance"]);
      }
    });
  }

  componentWillUnmount() {
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

  toggleNavbar = () => {
    this.setState({
      collapsed: !this.state.collapsed
    })
  }

  toggleSelectionPrompt = () => {
    this.setState({
        isSelectPromptOpen: !this.state.isSelectPromptOpen
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
      let curr_time = date.toLocaleString('en-US', { timeZone: 'America/Chicago' });

      // extract features of the new value  [row, col, prev, new]
      let feature = "";
      let prev_value = chn_copy[0][2];
      if (isNaN(chn_copy[0][3])) {
        feature = "STR";
      } else if (chn_copy[0][3].length === 0) {
        feature = "EMPTY";
      } else {
        feature = "DIGIT";
      }

      // record user action
      user_actions.push([this.state.name, "edit_cell", chn_copy[0][0], chn_copy[0][1], feature, this.state.curr_table, chn_copy[0][0] + 1, col_headers[chn_copy[0][1]], curr_time]);
      
      pending_changes.user = this.state.user_name
  
      let temp = []; // [table_name, change_type, value, search_attribute, update_attribute]
      let y_coord = parseInt(chn_copy[0][0]);
      let x_coord = parseInt(chn_copy[0][1]);
      let actual_value = chn_copy[0][3];
      temp[0] = this.state.curr_table;
      temp[1] = "cell_change";
      temp[2] = actual_value;
      
      // find the correct attribute
      if (this.state.curr_table === "monthly_expense") {
        // check for insertion 
        let insertion = true;
        for (var j = 0; j < monthly_expense_display[y_coord].length; j++) {
          if (j === x_coord) {
            if (prev_value === "") {
              continue;
            } else {
              insertion = false;
              break;
            }
          }
          if (monthly_expense_display[y_coord][j] !== "") {
            insertion = false;
            break;
          }
        }

        if (insertion) {  // [table_name, change_type, operation, value, search_attribute] for insert
          temp[1] = "layout_change";
          temp[2] = "insert_r";
          temp[3] = actual_value;
          temp[4] = monthly_expense_col_headers[x_coord];
          temp[5] = socket_id;
          temp[6] = y_coord;
        } else {
          // [table_name, change_type, update_value, update_attribute, search_attribute1, search_attribute2, y_coord, x_coord] for cell changes
          temp[3] = monthly_expense_col_headers[x_coord];
          if (x_coord === 0) {
            temp[4] = prev_value;
          } else {
            temp[4] = monthly_expense_display[y_coord][0];
          }
          
          if (x_coord === 1) {
            temp[5] = prev_value;
          } else {
            temp[5] = monthly_expense_display[y_coord][1];
          }
          
          temp[6] = y_coord;
          temp[7] = x_coord;
        }

      } else if (this.state.curr_table === "check_book") {
        // check for insertion 
        let insertion = true;
        for (var j = 0; j < check_book_display[y_coord].length; j++) {
          if (j === x_coord) {
            if (prev_value === "") {
              continue;
            } else {
              insertion = false;
              break;
            }
          }
          if (check_book_display[y_coord][j] !== "") {
            insertion = false;
            break;
          }
        }

        if (insertion) {  // [table_name, change_type, operation, value, search_attribute] for insert
          temp[1] = "layout_change";
          temp[2] = "insert_r";
          temp[3] = actual_value;
          temp[4] = check_book_col_headers[x_coord];
          temp[5] = socket_id;
          temp[6] = y_coord;
        } else {
          // [table_name, change_type, update_value, update_attribute, search_attribute1, search_attribute2, y_coord, x_coord] for cell changes
          temp[3] = check_book_col_headers[x_coord];

          if (x_coord === 0) {
            temp[4] = prev_value;
          } else {
            temp[4] = check_book_display[y_coord][0];
          }
          
          if (x_coord === 1) {
            temp[5] = prev_value;
          } else {
            temp[5] = check_book_display[y_coord][1];
          }
          
          temp[6] = y_coord;
          temp[7] = x_coord;
        }

      } else if (this.state.curr_table === "check_book2") {
        // check for insertion 
        let insertion = true;
        for (var j = 0; j < check_book2_display[y_coord].length; j++) {
          if (j === x_coord) {
            if (prev_value === "") {
              continue;
            } else {
              insertion = false;
              break;
            }
          }
          if (check_book2_display[y_coord][j] !== "") {
            insertion = false;
            break;
          }
        }

        if (insertion) {  // [table_name, change_type, operation, value, search_attribute] for insert
          temp[1] = "layout_change";
          temp[2] = "insert_r";
          temp[3] = actual_value;
          temp[4] = check_book2_col_headers[x_coord];
          temp[5] = socket_id;
          temp[6] = y_coord;
        } else {
          // [table_name, change_type, update_value, update_attribute, search_attribute1, search_attribute2, y_coord, x_coord] for cell changes
          temp[3] = check_book2_col_headers[x_coord];

          if (x_coord === 0) {
            temp[4] = prev_value;
          } else {
            temp[4] = check_book2_display[y_coord][0];
          }
          
          if (x_coord === 1) {
            temp[5] = prev_value;
          } else {
            temp[5] = check_book2_display[y_coord][1];
          }
          
          temp[6] = y_coord;
          temp[7] = x_coord;
        }

      } else if (this.state.curr_table === "check_book3") {
        // check for insertion 
        let insertion = true;
        for (var j = 0; j < check_book3_display[y_coord].length; j++) {
          if (j === x_coord) {
            if (prev_value === "") {
              continue;
            } else {
              insertion = false;
              break;
            }
          }
          if (check_book3_display[y_coord][j] !== "") {
            insertion = false;
            break;
          }
        }

        if (insertion) {  // [table_name, change_type, operation, value, search_attribute] for insert
          temp[1] = "layout_change";
          temp[2] = "insert_r";
          temp[3] = actual_value;
          temp[4] = check_book3_col_headers[x_coord];
          temp[5] = socket_id;
          temp[6] = y_coord;
        } else {
          // [table_name, change_type, update_value, update_attribute, search_attribute1, search_attribute2, y_coord, x_coord] for cell changes
          temp[3] = check_book3_col_headers[x_coord];
          if (x_coord === 0) {
            temp[4] = prev_value;
          } else {
            temp[4] = check_book3_display[y_coord][0];
          }
          temp[5] = null;
          temp[6] = y_coord;
          temp[7] = x_coord;
        }

      } else if (this.state.curr_table === "allowance") {
        // check for insertion 
        let insertion = true;
        for (var j = 0; j < allowance_display[y_coord].length; j++) {
          if (j === x_coord) {
            if (prev_value === "") {
              continue;
            } else {
              insertion = false;
              break;
            }
          }
          if (allowance_display[y_coord][j] !== "") {
            insertion = false;
            break;
          }
        }

        if (insertion) {  // [table_name, change_type, operation, value, search_attribute] for insert
          temp[1] = "layout_change";
          temp[2] = "insert_r";
          temp[3] = actual_value;
          temp[4] = allowance_col_headers[x_coord];
          temp[5] = socket_id;
          temp[6] = y_coord;
        } else {
          // [table_name, change_type, update_value, update_attribute, search_attribute1, search_attribute2, y_coord, x_coord] for cell changes
          temp[3] = allowance_col_headers[x_coord];
          if (x_coord === 0) {
            temp[4] = prev_value;
          } else {
            temp[4] = allowance_display[y_coord][0];
          }
          temp[5] = null;
          temp[6] = y_coord;
          temp[7] = x_coord;
        }

      }

      pending_changes.data.push(temp);
      change_detected = false;
    } else {
      console.log("no changed detected")
    }
  }

  start_transaction = () => {
    // get current chicago time
    const date = new Date();
    let curr_time = date.toLocaleString('en-US', { timeZone: 'America/Chicago' });

    pending_changes.data = []
    this.setState({
      transaction_mode: true
    });
    in_transaction = true;
    transaction_button = <Button size='lg' className='display-button' color="primary" onClick={this.end_transaction} >End Transaction</Button> 
    setTimeout(() => {
      user_actions.push([this.state.name, "START_TRANSACTION", "START_TRANSACTION", "START_TRANSACTION", "START_TRANSACTION", "START_TRANSACTION", "START_TRANSACTION", "START_TRANSACTION", curr_time]);
    }, 200);
  }

  end_transaction = () => {
    // get current chicago time
    const date = new Date();
    let curr_time = date.toLocaleString('en-US', { timeZone: 'America/Chicago' });

    this.setState({
      transaction_mode: false
    });
    in_transaction = false;
    transaction_button = <Button size='lg' className='display-button' color="primary" onClick={this.start_transaction} >Start Transaction</Button>

    // signal backend to release locks | Removed for the first user study
    // this.socket.emit('FINISH_TRANSACTION');

    // send updates to socket
    setTimeout(() => {
      // remove data noise by removing the invisible click before end transaction
      if (user_actions.length >= 3) {
        if (user_actions[user_actions.length - 1][1] === "click" && user_actions[user_actions.length - 2][1] === "edit_cell" && user_actions[user_actions.length - 3][1] === "keyPress_enter") {
          user_actions.pop();
        }
      }
      user_actions.push([this.state.name, "END_TRANSACTION", "END_TRANSACTION", "END_TRANSACTION", "END_TRANSACTION", "END_TRANSACTION", "END_TRANSACTION", "END_TRANSACTION", curr_time]);
      this.commit_transaction();

      // send updates to the database
      const requestOptions = {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({pending_changes})
      };
      // fetch('https://spreadsheetactions.herokuapp.com/academic/update', requestOptions,  {mode: 'no-cors'})
    }, 500);
  }

  commit_transaction = () => {
    // send cell changes to the socket
    if (pending_changes.data.length !== 0) {
      this.socket.emit('SEND_MESSAGE', pending_changes);
    }

    // send layout changes to the socket
    if (layout_changes.changes.length !== 0) {

      // reset layout changes
      layout_changes.changes.length = 0;
      layout_changes.start_idx = 0;
    }
  }

  track_action = (e, action_type) => {

    // get current chicago time
    const date = new Date();
    let curr_time = date.toLocaleString('en-US', { timeZone: 'America/Chicago' });

    // check and update possible spreadsheet layout change
    if (layout_changes.layout_changed) { 

      // add in all layout changes
      for (var i = layout_changes.start_idx; i < layout_changes.changes.length; i++) {
        let layout_change_type = layout_changes.changes[i][0];
        let layout_change_direction = layout_changes.changes[i][1];
        let change_index = layout_changes.changes[i][2];
        user_actions.push([this.state.name, layout_change_type, change_index, layout_change_direction, null, this.state.curr_table, null, null, curr_time]); 
        layout_changes.start_idx++;
      }

      // clear up current layout_changes recorder
      layout_changes.layout_changed = false;
    }

    // // handle scroll actions
    // if (action_type === "scroll") {

    //   let scroll_diff = prev_scrolltop - e.target.scrollTop;
    //   let action_length = user_actions.length;

    //   // don't hace scroll_diff === 0 because each scroll on mouse will result in two identical function calls
    //   if (scroll_diff > 0) {
        
    //     // check if previous is a large up scroll. If so, do nothing
    //     if (action_length >= 1 && user_actions[action_length - 1][1] === "up_scroll_l") {
    //       // deliberately do nothing here
    //     }

    //     // check for combining 6 small up scrolls
    //     else if (action_length >= SCROLL_SIZE) {
    //       let combine = true;
    //       for (var i = 0; i < SCROLL_SIZE; i++) {
    //           if (user_actions[action_length - 1 - i][1] !== "up_scroll_s") {
    //             combine = false;
    //             break;
    //           }
    //       }

    //       if (combine) {
    //         for (var i = 0; i < SCROLL_SIZE; i++) {
    //             user_actions.pop();
    //         }
    //         user_actions.push([this.state.name, "up_scroll_l", null, null, null, this.state.curr_table, null, null, curr_time]);
    //       }

    //       else {
    //         user_actions.push([this.state.name, "up_scroll_s", null, null, null, this.state.curr_table, null, null, curr_time]);
    //       }
    //     }

    //     else {
    //       user_actions.push([this.state.name, "up_scroll_s", null, null, null, this.state.curr_table, null, null, curr_time]);
    //     }

    //   } else if (scroll_diff < 0) {

    //     // check if previous is a large down scroll. If so, do nothing
    //     if (action_length >= 1 && user_actions[action_length - 1][1] === "down_scroll_l") {
    //         // deliberately do nothing here
    //     }

    //     // check for combining 6 small scrolls
    //     else if (action_length >= SCROLL_SIZE) {
    //       let combine = true;
    //       for (var i = 0; i < SCROLL_SIZE; i++) {
    //           if (user_actions[action_length - 1 - i][1] !== "down_scroll_s") {
    //             combine = false;
    //             break;
    //           }
    //       }
          
    //       if (combine) {
    //         for (var i = 0; i < SCROLL_SIZE; i++) {
    //             user_actions.pop();
    //         }
    //         user_actions.push([this.state.name, "down_scroll_l", null, null, null, this.state.curr_table, null, null, curr_time]);
    //       }

    //       else {
    //         user_actions.push([this.state.name, "down_scroll_s", null, null, null, this.state.curr_table, null, null, curr_time]);
    //       }
    //     } 

    //     else {
    //       user_actions.push([this.state.name, "down_scroll_s", null, null, null, this.state.curr_table, null, null, curr_time]);
    //     }
    //   }
    //   this.handleScroll(e);
    // }

    // calculate click action
    else if (action_type === "click") {

      if (currently_editing) {
        
        // select a row
        if (select_j < 0) {
          user_actions.push([this.state.name, "select_r", select_i, null, null, this.state.curr_table, null, null, curr_time]);
        }

        // select a column
        else if (select_i < 0) {
          user_actions.push([this.state.name, "select_c", select_j, null, null, this.state.curr_table, null, null, curr_time]);
        }
        
        // select a cell
        else {
          user_actions.push([this.state.name, action_type, select_i, select_j, null, this.state.curr_table, select_i + 1, col_headers[select_j], curr_time]);
        }
        currently_editing = false;
      }
      this.check_cell_change();
    }

    // calculate kepress action
    else if (action_type === "key_press") {

      if (currently_editing) {
        console.log("currently editing");
         // left arrow
        if (e.keyCode === 37) {
          user_actions.push([this.state.name, "left_arrow", select_i, select_j, null, this.state.curr_table, select_i + 1, col_headers[select_j], curr_time]);
        }

        // up arrow
        else if (e.keyCode === 38) {
          user_actions.push([this.state.name, "up_arrow", select_i, select_j, null, this.state.curr_table, select_i + 1, col_headers[select_j], curr_time]);
        }

        // right arrow
        else if (e.keyCode === 39) {
          user_actions.push([this.state.name, "right_arrow", select_i, select_j, null, this.state.curr_table, select_i + 1, col_headers[select_j], curr_time]);
        }

        // down arrow
        else if (e.keyCode === 40) {
          user_actions.push([this.state.name, "down_arrow", select_i, select_j, null, this.state.curr_table, select_i + 1, col_headers[select_j], curr_time]);
        }
      }

      if (change_detected) {
        // handle enter press
        if (e.key === "Enter") {
          user_actions.push([this.state.name, "keyPress_enter", chn_copy[0][0], chn_copy[0][1], null, this.state.curr_table, chn_copy[0][0] + 1, col_headers[chn_copy[0][1]], curr_time]);
        }

        // handle tab press
        else if (e.key === "Tab") {
          user_actions.push([this.state.name, "keyPress_tab", chn_copy[0][0], chn_copy[0][1], null, this.state.curr_table, chn_copy[0][0] + 1, col_headers[chn_copy[0][1]], curr_time]);
        }

        // all other press 
        else {
          user_actions.push([this.state.name, "keyPress", chn_copy[0][0], chn_copy[0][1], null, this.state.curr_table, chn_copy[0][0] + 1, col_headers[chn_copy[0][1]], curr_time]);
        }
      }
      this.check_cell_change();
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
    fetch('https://spreadsheetactions.herokuapp.com/training/send-training-data/financing', requestOptions);

    // bring the comfirmation modal up
    this.toggleCompleteConfirmModal();
  }

  toggle = (tab) => {
    if (this.state.activeTab !== tab) {
        this.setState({ activeTab: tab });
    }
    if (tab === "1") {  
      this.setState({
        curr_table: "monthly_expense"
      })
      col_headers = monthly_expense_col_headers;

    } else if (tab === "2") {
      this.setState({
        curr_table: "check_book"
      })
      col_headers = check_book_col_headers;
    } else if (tab === "3") {
      this.setState({
        curr_table: "check_book2"
      })
      col_headers = check_book2_col_headers;
    } else if (tab === "4") {
      this.setState({
        curr_table: "check_book3"
      })
      col_headers = check_book3_col_headers;
    } else if (tab === "5") {
      this.setState({
        curr_table: "allowance"
      })
      col_headers = allowance_col_headers;
    } 
  }

  load_tables = (e) => {
    e.preventDefault();
    if (table_loaded) {
      this.toggleInstructionModal();
    } else {
      table_loaded = true;
      utils.load_simulation_v2(1, "monthly_expense", monthly_expense_display, load_error, monthly_expense_col_headers);
      utils.load_simulation_v2(1, "check_book", check_book_display, load_error, check_book_col_headers);
      utils.load_simulation_v2(1, "check_book2", check_book2_display, load_error, check_book2_col_headers);
      utils.load_simulation_v2(1, "check_book3", check_book3_display, load_error, check_book3_col_headers);
      utils.load_simulation_v2(1, "allowance", allowance_display, load_error, allowance_col_headers);
      setTimeout(() => {
          monthly_expense_display = [monthly_expense_col_headers].concat(monthly_expense_display);
          check_book_display = [check_book_col_headers].concat(check_book_display);
          check_book2_display = [check_book2_col_headers].concat(check_book2_display);
          check_book3_display = [check_book3_col_headers].concat(check_book3_display);
          allowance_display = [allowance_col_headers].concat(allowance_display);
          this.setState({
            isInstructionOpen: false
          })
      }, 3000);
      col_headers = monthly_expense_col_headers;
      this.setState({
        isNameModalOpen: true
      })
    }
  }

  reload_tables = () => {
    table_loaded = true;
    utils.load_simulation_v2(1, "monthly_expense", monthly_expense_display, load_error, monthly_expense_col_headers);
    utils.load_simulation_v2(1, "check_book", check_book_display, load_error, check_book_col_headers);
    utils.load_simulation_v2(1, "check_book2", check_book_display, load_error, check_book_col_headers);
    utils.load_simulation_v2(1, "check_book3", check_book_display, load_error, check_book_col_headers);
    utils.load_simulation_v2(1, "allowance", allowance_display, load_error, allowance_col_headers);
    setTimeout(() => {
        monthly_expense_display = [monthly_expense_col_headers].concat(monthly_expense_display);
        check_book_display = [check_book_col_headers].concat(check_book_display);
        check_book2_display = [check_book2_col_headers].concat(check_book2_display);
        check_book3_display = [check_book3_col_headers].concat(check_book3_display);
        allowance_display = [allowance_col_headers].concat(allowance_display);
    }, 3000);
    col_headers = monthly_expense_col_headers;
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
      simulation: "financing"
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

  restart = () => {
    // rollback current transaction
    if (this.state.transaction_mode) {
      this.setState({
        transaction_mode: false
      });
      in_transaction = false;
      transaction_button = <Button size='lg' className='display-button' color="primary" onClick={this.start_transaction} >Start Transaction</Button>
    }

    // reset all display
    monthly_expense_display = [];
    check_book_display = [];
    check_book2_display = [];
    check_book3_display = [];
    allowance_display = [];

    // reset all col headers
    monthly_expense_col_headers = [];
    check_book_col_headers = [];
    check_book2_col_headers = [];
    check_book3_col_headers = [];
    allowance_col_headers = [];

    // reset load error
    load_error[0][0] = 0;

    // reload all tables
    this.reload_tables();

    // clear recorded actions
    user_actions = [];

    // set tab
    this.setState({
      activeTab: '1'
    })
    this.toggle('1');

    // open restart confirmation
    this.setState({
      isRestartModalOpen: true
    })
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

  refresh = () => {
    console.log(monthly_expense_display);
    console.log(check_book_display);
    console.log(check_book2_display);
    console.log(check_book3_display);
    console.log(allowance_display);
    this.setState({
      refresh: !this.state.refresh
    });
  }

  record_read_cell = () => {

    // get current chicago time
    const date = new Date();
    let curr_time = date.toLocaleString('en-US', { timeZone: 'America/Chicago' });

    // find the correct table
    let table = "";
    if (this.state.curr_table === "monthly_expense") {
      table = monthly_expense_display;
    } else if (this.state.curr_table === "check_book") {
      table = check_book_display;
    } else if (this.state.curr_table === "check_book2") {
      table = check_book2_display;
    } else if (this.state.curr_table === "check_book_3") {
      table = check_book3_display;
    } else if (this.state.curr_table === "allowance") {
      table = allowance_display;
    } 

    // extract features of the new value  [row, col, prev, new]
    let feature = "EMPTY";
    if (table[select_i][select_j] !== null && table[select_i][select_j].length !== 0 && isNaN(table[select_i][select_j])) {
      feature = "STR";
    } else if (table[select_i][select_j] !== null && table[select_i][select_j].length !== 0 && !isNaN(table[select_i][select_j])) {
      feature = "DIGIT";
    }

    if (user_actions.length !== 0) {
      let prev_action = user_actions[user_actions.length - 1];
      if (prev_action[1] == "READ" && prev_action[2] == select_i && prev_action[3] == select_j) {
        // do nothing
      } else {
        user_actions.push([this.state.name, "READ", select_i, select_j, feature, this.state.curr_table, select_i + 1, col_headers[select_j], curr_time]);
      }

    } else {
      user_actions.push([this.state.name, "READ", select_i, select_j, feature, this.state.curr_table, select_i + 1, col_headers[select_j], curr_time]);
    }
  }

  indicate_error = () => {
    user_actions.push([this.state.name, "ERR", "ERR", "ERR", "ERR", "ERR", "ERR", "ERR", "ERR"]);
  }

  render() {
    return (
      <div onClick={e => this.track_action(e, "click")} onKeyUp={e => this.track_action(e, "key_press")} className="App">
        <script src="node_modules/handsontable/dist/handsontable.full.min.js"></script>
        <link href="node_modules/handsontable/dist/handsontable.full.min.css" rel="stylesheet" media="screen"></link>
         <Jumbotron className='logo-jumbo'>
          </Jumbotron >
          <div>
            <Jumbotron >
                  <h1 className="display-3">Hi {this.state.name}, welcome to Financing Simulation!</h1>
                  <p className="lead">This is a simple web interface that allows you to upload spreadsheets and retrieve data.</p>
                  <hr className="my-2" />
                  {this.state.user_text_block}
                  <p className="lead">
                    &nbsp;&nbsp;&nbsp;&nbsp;
                    {transaction_button}
                    &nbsp;&nbsp;&nbsp;&nbsp;
                    <Button size='lg' className='display-button' color="info" onClick={this.store_training_data} >Complete Simulation</Button>
                    &nbsp;&nbsp;&nbsp;&nbsp;
                    <Button size='lg' className='display-button' color="info" onClick={this.restart} >Restart Simulation</Button>
                    &nbsp;&nbsp;&nbsp;&nbsp;
                    <Button size='lg' className='display-button' color="info" onClick={this.toggleInstructionModal} >Instruction</Button>
                    &nbsp;&nbsp;&nbsp;&nbsp;
                    <Button size='lg' className='display-button' color="info" onClick={this.record_read_cell} >Read Cell</Button>
                    &nbsp;&nbsp;&nbsp;&nbsp;
                    <Button size='lg' className='display-button' color="info" onClick={this.indicate_error} >Alert</Button>
                  </p>
                  {this.state.edit_message}

                  <Modal size='lg' isOpen={this.state.isInstructionOpen} >
                    <ModalBody>
                        <h2>Welcome</h2>
                        Welcome to Academic Simulation! This instruction can be accessed at any time by clicking the "Instruction" button on this webpage. 
                        Under this simulation, there are three tables: a "Monthly Expenses" table, a "Monthly Income" table, and a "Transaction Log" table. This simulation has only one part 
                        but there are two tasks to complete within this part. 
                        <br/>
                        <h5>Note: </h5>
                        When you first enter this simulation, please check if all tables are loaded. If some tables only have headers loaded but no content, press the refresh button.   
                        <hr className="my-2" />
                        
                        <p className="margin-one">
                        <h2>Task 1</h2>
                        For task 1, you need to go through the expenses and incomes for a 6-month preiod described in the "Story" section in the introduction document, and for each one, log it into 
                        the "Transaction Log" table. Inside the Transaction Log table, the “ID” column is the feature that differentiates each transaction, and it’s your choice to fill in whatever 
                        id system you want (E.g. “one”, “two”, … or “001”, “002”…), as long as it is logical. The “date” column corresponds to the date that an expense or income occurs. The “Transaction” 
                        column is a description of the expense or income, which you can write in your own words. For the “Withdraw” and “Deposit” columns, if the event is an expense, you should 
                        write the monetary amount to the “Withdraw” column, and leave the “Deposit” plank; if the event is an income, you should write the monetary amount to the “Deposit” column 
                        and leave the “Withdraw” blank. For each entry into the Transaction Log, you also need to manually calculate the remaining balance in the “Balance” column. A deposit 
                        increases the balance by the deposit amount, and a withdraw decreases the balance by the withdraw amount. You will assume that the original balance is $2,000. Further details 
                        of the instruction are also included in that document we sent you via email. If you did not received the document, please contact ninghan2@illinois.edu.
                        <br/>
                        </p>
                        <hr className="my-2" />

                        <p className="margin-one">
                        <h2>Task 2</h2>
                        As you are going through each expense and income from the "Story" section from the introduction document, you also need to update the "Monthly Expenses" table and "Monthly Income" table 
                        accordingly. The general rule is that if the event is an expense, you should reflect it in the Monthly Expenses table, and if the event is an income, you should reflect 
                        it in the Monthly Income table. For both "Montly Expenses" and "Monthly Income" table, the “Category” column indicates the category of each expense or income. A category could 
                        contain/summarize multiple expenses/incomes, or just one expense/income. For example, in the Monthly Expenses table, you could have a “Restaurant” category, and the expense 
                        under this category should be the sum of all expenses on restaurants within that month. You could also have a “Rent” category, which only contains one expense on rent per 
                        month since we pay rent once a month. You could also come up with categories that may only have values on certain months and have no values on other months. For example, 
                        if you have a “Clothing” category, and you spent a total of $500 on clothing on Jan. and $0 on Feb., then this category should have no value on Feb. How to name and use 
                        the categories of expenses and incomes are your choice but should be logical. All the other columns are self-explanatory. Further details 
                        of the instruction are also included in that document we sent you via email. If you did not received the document, please contact ninghan2@illinois.edu.
                        <br/>
                        </p>
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
                    <ModalHeader toggle={this.toggleRestartModal}>Restart Confirmation</ModalHeader>
                    <ModalBody>
                      Your simulation has been restarted. All the changes that haven't been committed yet are clearned. 
                    </ModalBody>
                    <ModalFooter>
                      <Button size='lg' className='display-button' color="info" onClick={this.close_restart_comfirmation}>Got It</Button>
                    </ModalFooter>
                  </Modal>

                  <Modal size='lg' isOpen={this.state.isCompleteConfirmationModalOpen} toggle={this.toggleCompleteConfirmModal}>
                    <ModalHeader toggle={this.toggleCompleteConfirmModal}>Complete Confirmation</ModalHeader>
                    <ModalBody>
                      The simulation has been completed and submitted! You can simply close this webpage. If you submitted by mistake or 
                      need to report an error, please contact ninghan2@illinois.edu 
                    </ModalBody>
                    <ModalFooter>
                      <Button size='lg' className='display-button' color="info" onClick={this.close_confirmation}>Got It</Button>
                    </ModalFooter>
                  </Modal>

                  <Modal size='lg' isOpen={this.state.isLoadErrorModelOpen} toggle={this.toggleLoadErrorModal}>
                    <ModalHeader toggle={this.toggleLoadErrorModal}>Load Error!</ModalHeader>
                    <ModalBody>
                      Something went wrong while loading your tables. Please press the "Restart" button on your screen to reload the tables after you close this message. If the error keeps coming up, 
                      contact ninghan2@illinois.edu 
                    </ModalBody>
                    <ModalFooter>
                      <Button size='lg' className='display-button' color="info" onClick={this.toggleLoadErrorModal}>Close Message</Button>
                    </ModalFooter>
                  </Modal>
                  
                        
            </Jumbotron>
        </div>
        {/* <hr /> */}

        <Nav tabs>
            <NavItem>
                <NavLink
                    className={classnames({ active: this.state.activeTab === '1' })}
                    onClick={() => { this.toggle('1'); }}>
                    Monthly Expenses
                </NavLink>
            </NavItem>
            <NavItem>
                <NavLink
                    className={classnames({ active: this.state.activeTab === '2' })}
                    onClick={() => { this.toggle('2'); }}>
                    Parent Check Book
                </NavLink>
            </NavItem>
            <NavItem>
                <NavLink
                    className={classnames({ active: this.state.activeTab === '3' })}
                    onClick={() => { this.toggle('3'); }}>
                    Child 1 Check Book
                </NavLink>
            </NavItem>
            <NavItem>
                <NavLink
                    className={classnames({ active: this.state.activeTab === '4' })}
                    onClick={() => { this.toggle('4'); }}>
                    Child 2 Check Book
                </NavLink>
            </NavItem>
            <NavItem>
                <NavLink
                    className={classnames({ active: this.state.activeTab === '5' })}
                    onClick={() => { this.toggle('5'); }}>
                    Allowance
                </NavLink>
            </NavItem>
        </Nav>
        <TabContent activeTab={this.state.activeTab}>
            <TabPane tabId="1">
                <h4>
                    Monthly Expenses Table
                </h4> 
                <div id = "display_portion" onScrollCapture={e => this.track_action(e, "scroll")}  tabIndex="1">
                    <HotTable className="handsontable" id ="display_table" data={monthly_expense_display} ref={this.hotTableComponent} id={this.id}
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
                    
            </TabPane>
            <TabPane tabId="2">
                <h4>
                    Parent Check Book
                </h4> 
                <div id = "display_portion" onScrollCapture={e => this.track_action(e, "scroll")}  tabIndex="2">
                    <HotTable className="handsontable" id ="display_table" data={check_book_display} ref={this.hotTableComponent1} id={this.id}
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
                    
            </TabPane>
            <TabPane tabId="3">
                <h4>
                    Child 1 Check Book
                </h4> 
                <div id = "display_portion" onScrollCapture={e => this.track_action(e, "scroll")}  tabIndex="3">
                    <HotTable className="handsontable" id ="display_table" data={check_book2_display} ref={this.hotTableComponent2} id={this.id}
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
                    
            </TabPane>
            <TabPane tabId="4">
                <h4>
                    Child 2 Check Book
                </h4> 
                <div id = "display_portion" onScrollCapture={e => this.track_action(e, "scroll")}  tabIndex="4">
                    <HotTable className="handsontable" id ="display_table" data={check_book3_display} ref={this.hotTableComponent3} id={this.id}
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
                    
            </TabPane>
            <TabPane tabId="5">
                <h4>
                    Allowance
                </h4> 
                <div id = "display_portion" onScrollCapture={e => this.track_action(e, "scroll")}  tabIndex="5">
                    <HotTable className="handsontable" id ="display_table" data={allowance_display} ref={this.hotTableComponent4} id={this.id}
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
                    
            </TabPane>
        </TabContent>
          
      </div>

    );
  }
}
export default Financing;
