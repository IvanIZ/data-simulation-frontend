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
let table_loaded = false;

let simulation_type = "";

// A JSON object that keeps track of previous layout changes
let layout_changes = {
  layout_changed: false,
  changes: [] // 1st element: action;  2nd element: index
}

let col_headers = []
let monthly_expense_col_headers = [];
let monthly_income_col_headers = [];
let check_book_col_headers = [];
let check_book2_col_headers = [];
let check_book3_col_headers = [];

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

let socket_id = "";

let pending_changes = {
  data:[], // 2d array to store difference: y, value, x, 
  try_message: "SENT MESSAGE! SUCCESS!", 
  user: ""
}

class Financing extends Component {

  constructor() {
    super();
    this.id = "hot";
    this.hotTableComponent = React.createRef();
    this.hotTableComponent1 = React.createRef();
    this.hotTableComponent2 = React.createRef();
    this.hotTableComponent3 = React.createRef();
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
      curr_table: "monthly_expenses"
    }

    // Socket io stuff =========================================================================================

    this.socket = io('https://spreadsheetactions.herokuapp.com/');
    // this.socket = io('localhost:3001');

    this.socket.on('RECEIVE_ID', function(id){
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

    // receive updates on spreadsheet from other users
    this.socket.on('RECEIVE_MESSAGE', function(data){
      addMessage(data);
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

    const addMessage = data => {
      console.log("the data in addMessage is: ", data);
      let change_table = data.data
      for (var x = 0; x < change_table.length; x++) {
        // Extract data
        let j = change_table[x][0] - 1   // 0 --> y_coord
        let value = change_table[x][1] // 1 --> actual value
        let i = change_table[x][2] - 1 // 2 --> x_coord
        let table = change_table[x][3]; // table corresponds to this change  

        // reflect each update to its corresponding table
        if (table === "monthly_expenses") {
            monthly_expense_display[i][j] = value;
        } else if (table === "monthly_income") {
            monthly_income_display[i][j] = value;
        } else if (table === "check_book") {
            check_book_display[i][j] = value;
        } else if (table === "check_book2") {
            check_book2_display[i][j] = value;
        } else if (table === "check_book3") {
            check_book3_display[i][j] = value;
        }
      }
  };

    // Socket io stuff =========================================================================================

    this.toggleSelectionPrompt = this.toggleSelectionPrompt.bind()
    this.toggleNavbar = this.toggleNavbar.bind()
    this.toggleInstructionModal = this.toggleInstructionModal.bind();
    this.toggleRedirectConfirmModal = this.toggleRedirectConfirmModal.bind();
    this.toggleNameModal = this.toggleNameModal.bind();
    this.toggleRestartModal = this.toggleRestartModal.bind();
    this.toggleCompleteConfirmModal = this.toggleCompleteConfirmModal.bind();
  }

  // fetch 50 rows of data into the buffer
  async componentDidMount() {
    recorded_time = Date.now() / 1000;

    transaction_button = <Button size='lg' className='display-button' color="primary" onClick={this.start_transaction} >Start Transaction</Button>

    // FIRST REF ====================================================================================================
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
    });

    this.hotTableComponent.current.hotInstance.addHook('afterSelection', function(row, column, row2, column2, preventScrolling, selectionLayerLevel) {

      // record the currently editing location and state. 
      select_i = row;
      select_j = column;
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
    });

    this.hotTableComponent.current.hotInstance.addHook('afterRemoveCol', function(index, amount, physicalRows, source) {
      layout_changes.layout_changed = true;
      layout_changes.changes.push(["remove_c", null, index]);
    });

    // SECOND REF ====================================================================================================
    this.hotTableComponent1.current.hotInstance.addHook('afterChange', function(chn, src) {
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

    this.hotTableComponent1.current.hotInstance.addHook('afterCreateRow', function(index, amount, source) {
      console.log("insert index is: ", index);
      if (source === "ContextMenu.rowBelow") {
        layout_changes.layout_changed = true;
        layout_changes.changes.push(["insert_r", "below", index]);
      } else {
        layout_changes.layout_changed = true;
        layout_changes.changes.push(["insert_r", "above", index]);
      }
    });

    this.hotTableComponent1.current.hotInstance.addHook('afterCreateCol', function(index, amount, source) {
      console.log("insert index is: ", index);
      if (source === "ContextMenu.columnRight") {
        layout_changes.layout_changed = true;
        layout_changes.changes.push(["insert_c", "right", index]);
      } else {
        layout_changes.layout_changed = true;
        layout_changes.changes.push(["insert_c", "left", index]);
      }
    });

    this.hotTableComponent1.current.hotInstance.addHook('afterRemoveRow', function(index, amount, physicalRows, source) {
      layout_changes.layout_changed = true;
      layout_changes.changes.push(["remove_r", null, index]);
    });

    this.hotTableComponent1.current.hotInstance.addHook('afterRemoveCol', function(index, amount, physicalRows, source) {
      layout_changes.layout_changed = true;
      layout_changes.changes.push(["remove_c", null, index]);
    });

    // THIRD REF ====================================================================================================
    this.hotTableComponent2.current.hotInstance.addHook('afterChange', function(chn, src) {
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

    this.hotTableComponent2.current.hotInstance.addHook('afterCreateRow', function(index, amount, source) {
      console.log("insert index is: ", index);
      if (source === "ContextMenu.rowBelow") {
        layout_changes.layout_changed = true;
        layout_changes.changes.push(["insert_r", "below", index]);
      } else {
        layout_changes.layout_changed = true;
        layout_changes.changes.push(["insert_r", "above", index]);
      }
    });

    this.hotTableComponent2.current.hotInstance.addHook('afterCreateCol', function(index, amount, source) {
      console.log("insert index is: ", index);
      if (source === "ContextMenu.columnRight") {
        layout_changes.layout_changed = true;
        layout_changes.changes.push(["insert_c", "right", index]);
      } else {
        layout_changes.layout_changed = true;
        layout_changes.changes.push(["insert_c", "left", index]);
      }
    });

    this.hotTableComponent2.current.hotInstance.addHook('afterRemoveRow', function(index, amount, physicalRows, source) {
      layout_changes.layout_changed = true;
      layout_changes.changes.push(["remove_r", null, index]);
    });

    this.hotTableComponent2.current.hotInstance.addHook('afterRemoveCol', function(index, amount, physicalRows, source) {
      layout_changes.layout_changed = true;
      layout_changes.changes.push(["remove_c", null, index]);
    });

    // FOURTH REF ====================================================================================================
    this.hotTableComponent3.current.hotInstance.addHook('afterChange', function(chn, src) {
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

    this.hotTableComponent3.current.hotInstance.addHook('afterCreateRow', function(index, amount, source) {
      console.log("insert index is: ", index);
      if (source === "ContextMenu.rowBelow") {
        layout_changes.layout_changed = true;
        layout_changes.changes.push(["insert_r", "below", index]);
      } else {
        layout_changes.layout_changed = true;
        layout_changes.changes.push(["insert_r", "above", index]);
      }
    });

    this.hotTableComponent3.current.hotInstance.addHook('afterCreateCol', function(index, amount, source) {
      console.log("insert index is: ", index);
      if (source === "ContextMenu.columnRight") {
        layout_changes.layout_changed = true;
        layout_changes.changes.push(["insert_c", "right", index]);
      } else {
        layout_changes.layout_changed = true;
        layout_changes.changes.push(["insert_c", "left", index]);
      }
    });

    this.hotTableComponent3.current.hotInstance.addHook('afterRemoveRow', function(index, amount, physicalRows, source) {
      layout_changes.layout_changed = true;
      layout_changes.changes.push(["remove_r", null, index]);
    });

    this.hotTableComponent3.current.hotInstance.addHook('afterRemoveCol', function(index, amount, physicalRows, source) {
      layout_changes.layout_changed = true;
      layout_changes.changes.push(["remove_c", null, index]);
    });
  }

  componentWillUnmount() {
    this.socket.disconnect();
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

  toggleRedirectConfirmModal = () => {
    this.setState({
      isRedirectConfirmOpen: !this.state.isRedirectConfirmOpen
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

  handleScroll = (e) => {
    const bottom = e.target.scrollHeight - e.target.scrollTop === e.target.clientHeight;
    if (bottom) {
      // this.display()
    }
    prev_scrolltop = e.target.scrollTop;
  }

  check_cell_change = () => {
    if (change_detected) {

      console.log("change detected!!!");

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
      user_actions.push([this.state.name, "edit_cell", chn_copy[0][0], chn_copy[0][1], feature, this.state.curr_table, chn_copy[0][0] + 1, col_headers[chn_copy[0][1]], state]);

      // this.request_exclusive_lock(chn_copy[0][0], chn_copy[0][1]);
      
      pending_changes.user = this.state.user_name
  
      let temp = [];
      let y_coord = parseInt(chn_copy[0][0]) + 1;
      let x_coord = parseInt(chn_copy[0][1]) + 1;
      let actual_value = chn_copy[0][3];
      temp[0] = x_coord;
      temp[1] = actual_value;
      temp[2] = y_coord;
      temp[3] = this.state.curr_table;
      pending_changes.data.push(temp);
      change_detected = false;
    } else {
      console.log("no changed detected")
    }
  }

  start_transaction = () => {
    pending_changes.data = []
    this.setState({
      transaction_mode: true
    })
    transaction_button = <Button size='lg' className='display-button' color="primary" onClick={this.end_transaction} >End Transaction</Button> 
    setTimeout(() => {
      user_actions.push(["START_TRANSACTION", "START_TRANSACTION", "START_TRANSACTION", "START_TRANSACTION", "START_TRANSACTION", "START_TRANSACTION", "START_TRANSACTION", "START_TRANSACTION", "START_TRANSACTION", ]);
    }, 200);
  }

  commit_transaction = () => {
    this.socket.emit('SEND_MESSAGE', pending_changes);
  }

  end_transaction = () => {
    this.setState({
      transaction_mode: false
    })
    transaction_button = <Button size='lg' className='display-button' color="primary" onClick={this.start_transaction} >Start Transaction</Button>
    setTimeout(() => {
      user_actions.push(["END_TRANSACTION", "END_TRANSACTION", "END_TRANSACTION", "END_TRANSACTION", "END_TRANSACTION", "END_TRANSACTION", "END_TRANSACTION", "END_TRANSACTION", "END_TRANSACTION"]);
      this.commit_transaction();
    }, 500);
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
      if (user_actions.length > 0 && user_actions[user_actions.length - 1][1] === "idle") {
        let prev_idle_time = user_actions[user_actions.length - 1][2];
        user_actions.pop();
        user_actions.push([this.state.name, "idle", parseInt(idle_duration) + prev_idle_time, null, null, this.state.curr_table, null, null, state]);
      } else {
        user_actions.push([this.state.name, "idle", parseInt(idle_duration), null, null, this.state.curr_table, null, null, state]);
      }
    }

    // check and update possible spreadsheet layout change
    if (layout_changes.layout_changed) { 
      
      // remove prev idle action
      if (user_actions.length > 0 && user_actions[user_actions.length - 1][1] === "idle") {
        user_actions.pop();
      }

      // add in all layout changes
      for (var i = 0; i < layout_changes.changes.length; i++) {
        let layout_change_type = layout_changes.changes[i][0];
        let layout_change_direction = layout_changes.changes[i][1];
        let change_index = layout_changes.changes[i][2];
        user_actions.push([this.state.name, layout_change_type, change_index, layout_change_direction, null, this.state.curr_table, null, null, state]); 
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
        if (action_length >= 1 && user_actions[action_length - 1][1] === "up_scroll_l") {
          // deliberately do nothing here
        }

        // check for combining 6 small up scrolls
        else if (action_length >= SCROLL_SIZE) {
          let combine = true;
          for (var i = 0; i < SCROLL_SIZE; i++) {
              if (user_actions[action_length - 1 - i][1] !== "up_scroll_s") {
                combine = false;
                break;
              }
          }

          if (combine) {
            for (var i = 0; i < SCROLL_SIZE; i++) {
                user_actions.pop();
            }
            user_actions.push([this.state.name, "up_scroll_l", null, null, null, this.state.curr_table, null, null, state]);
          }

          else {
            user_actions.push([this.state.name, "up_scroll_s", null, null, null, this.state.curr_table, null, null, state]);
          }
        }

        else {
          user_actions.push([this.state.name, "up_scroll_s", null, null, null, this.state.curr_table, null, null, state]);
        }

      } else if (scroll_diff < 0) {

        // check if previous is a large down scroll. If so, do nothing
        if (action_length >= 1 && user_actions[action_length - 1][1] === "down_scroll_l") {
            // deliberately do nothing here
        }

        // check for combining 6 small scrolls
        else if (action_length >= SCROLL_SIZE) {
          let combine = true;
          for (var i = 0; i < SCROLL_SIZE; i++) {
              if (user_actions[action_length - 1 - i][1] !== "down_scroll_s") {
                combine = false;
                break;
              }
          }
          
          if (combine) {
            for (var i = 0; i < SCROLL_SIZE; i++) {
                user_actions.pop();
            }
            user_actions.push([this.state.name, "down_scroll_l", null, null, null, this.state.curr_table, null, null, state]);
          }

          else {
            user_actions.push([this.state.name, "down_scroll_s", null, null, null, this.state.curr_table, null, null, state]);
          }
        } 

        else {
          user_actions.push([this.state.name, "down_scroll_s", null, null, null, this.state.curr_table, null, null, state]);
        }
      }
      this.handleScroll(e);
    }

    // calculate click action
    else if (action_type === "click") {

      if (currently_editing) {
        
        // select a row
        if (select_j < 0) {
          user_actions.push([this.state.name, "select_r", select_i, null, null, this.state.curr_table, null, null, state]);
        }

        // select a column
        else if (select_i < 0) {
          user_actions.push([this.state.name, "select_c", select_j, null, null, this.state.curr_table, null, null, state]);
        }
        
        // select a cell
        else {
          user_actions.push([this.state.name, action_type, select_i, select_j, null, this.state.curr_table, select_i + 1, col_headers[select_j], state]);
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
          user_actions.push([this.state.name, "keyPress_enter", chn_copy[0][0], chn_copy[0][1], null, this.state.curr_table, chn_copy[0][0] + 1, col_headers[chn_copy[0][1]], state ]);
        }

        // handle tab press
        else if (e.key === "Tab") {
          user_actions.push([this.state.name, "keyPress_tab", chn_copy[0][0], chn_copy[0][1], null, this.state.curr_table, chn_copy[0][0] + 1, col_headers[chn_copy[0][1]], state]);
        }

        // all other press 
        else {
          user_actions.push([this.state.name, "keyPress", chn_copy[0][0], chn_copy[0][1], null, this.state.curr_table, chn_copy[0][0] + 1, col_headers[chn_copy[0][1]], state]);
        }
      }
      this.check_cell_change();
    }
    console.log(user_actions);
  }

  store_training_data = () => {
    user_actions.push([this.state.name, "END_TRAINING_DATA", null, null, null, this.state.curr_table, null, null, "END"]);
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

  select_simulation = (e) => {
    // e.preventDefault();
    if (e.target.name === "academic") {
      this.setState({
        redirect_link: '/academic'
      })
    }
    if (e.target.name === "financing") {
      this.setState({
        redirect_link: '/financing'
      })
    }
    if (e.target.name === "management") {
      this.setState({
        redirect_link: '/management'
      })
    }
    this.toggleRedirectConfirmModal();
  }

  toggle = (tab) => {
    if (this.state.activeTab !== tab) {
        this.setState({ activeTab: tab });
    }
    if (tab === "1") {  
      this.setState({
        curr_table: "monthly_expenses"
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
    }
  }

  load_tables = (e) => {
    e.preventDefault();
    if (table_loaded) {
      this.toggleInstructionModal();
    } else {
      table_loaded = true;
      utils.load_simulation_v2(1, "monthly_expense", monthly_expense_display, buffer_copy, monthly_expense_col_headers);
      utils.load_simulation_v2(1, "check_book", check_book_display, buffer_copy, check_book_col_headers);
      utils.load_simulation_v2(1, "check_book2", check_book2_display, buffer_copy, check_book2_col_headers);
      utils.load_simulation_v2(1, "check_book3", check_book3_display, buffer_copy, check_book3_col_headers);
      setTimeout(() => {
          monthly_expense_display = [monthly_expense_col_headers].concat(monthly_expense_display);
          check_book_display = [check_book_col_headers].concat(check_book_display);
          check_book2_display = [check_book2_col_headers].concat(check_book2_display);
          check_book3_display = [check_book3_col_headers].concat(check_book3_display);
          this.toggleInstructionModal();
      }, 2000);
      col_headers = monthly_expense_col_headers;
      this.toggleNameModal();
    }
  }

  reload_tables = () => {
    utils.load_simulation_v2(1, "monthly_expense", monthly_expense_display, buffer_copy, monthly_expense_col_headers);
    utils.load_simulation_v2(1, "check_book", check_book_display, buffer_copy, check_book_col_headers);
    utils.load_simulation_v2(1, "check_book2", check_book_display, buffer_copy, check_book_col_headers);
    utils.load_simulation_v2(1, "check_book3", check_book_display, buffer_copy, check_book_col_headers);
    setTimeout(() => {
        monthly_expense_display = [monthly_expense_col_headers].concat(monthly_expense_display);
        check_book_display = [check_book_col_headers].concat(check_book_display);
        check_book2_display = [check_book2_col_headers].concat(check_book2_display);
        check_book3_display = [check_book3_col_headers].concat(check_book3_display);
    }, 500);
    col_headers = monthly_expense_col_headers;
  }

  redirect = (e) => {
    e.preventDefault();
    this.setState({
      redirect: true
    });

    // reset all display
    monthly_expense_display = [];
    check_book_display = [];
    monthly_expense_col_headers = [];
    monthly_income_col_headers = [];
    check_book_col_headers = [];

    // clear recorded actions
    user_actions = [];
    table_loaded = false;
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
    console.log("sending user name");
    this.toggleNameModal();
  }

  restart = () => {
    // reset all display
    monthly_expense_display = [];
    check_book_display = [];
    monthly_expense_col_headers = [];
    monthly_income_col_headers = [];
    check_book_col_headers = [];

    // reload all tables
    this.reload_tables();

    // clear recorded actions
    user_actions = [];

    // set tab
    this.setState({
      activeTab: '1'
    })
    this.toggle('1');

    // toggle restart confirmation
    this.toggleRestartModal();
  }

  close_confirmation = () => {
    user_actions = []
    this.toggleCompleteConfirmModal();
  }

  render() {
    if (this.state.redirect) {
      return <Redirect to={this.state.redirect_link} />
    }
    return (
      <div onClick={e => this.track_action(e, "click")} onKeyUp={e => this.track_action(e, "key_press")} className="App">
        <script src="node_modules/handsontable/dist/handsontable.full.min.js"></script>
        <link href="node_modules/handsontable/dist/handsontable.full.min.css" rel="stylesheet" media="screen"></link>
         <Jumbotron className='logo-jumbo'>
          <ButtonDropdown isOpen={this.state.collapsed} toggle={this.toggleNavbar} style={{float: 'left'}} className="up-margin-one">
                <DropdownToggle color="#61dafb"  caret style={{float: 'right'}}>
                  Change Simulation
                </DropdownToggle>
                <DropdownMenu>
                  <DropdownItem name="academic" id="academic" onClick={e => this.select_simulation(e)}>Academic Simulation</DropdownItem>
                  <DropdownItem divider />
                  <DropdownItem name="management" id="management" onClick={e => this.select_simulation(e)}>Management Simulation</DropdownItem>
                </DropdownMenu>
          </ButtonDropdown>
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
                  </p>
                  {this.state.edit_message}

                  <Modal size='lg' isOpen={this.state.isInstructionOpen} >
                    <ModalBody>
                        <h2>Welcome</h2>
                        Welcome to Academic Simulation! This instruction can be accessed at any time by clicking the "Instruction" button on this webpage. 
                        Under this simulation, there are three tables: a "Monthly Expenses" table, a "Monthly Income" table, and a "Transaction Log" table. This simulation has only one part 
                        but there are two tasks to complete within this part. 
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

                  <Modal size='lg' isOpen={this.state.isRedirectConfirmOpen} toggle={this.toggleRedirectConfirmModal}>
                    <ModalHeader toggle={this.toggleRedirectConfirmModal}>Are you sure you want to leave this page?</ModalHeader>
                    <ModalBody>
                      Note that once you leave this simulation page, you will lose all the records and progress on this simulation. 
                    </ModalBody>
                    <ModalFooter>
                    <Button size='lg' className='display-button' color="info" onClick={this.redirect}>Confirm</Button> {' '}
                    <Button size='lg' className='display-button' color="info" onClick={this.toggleRedirectConfirmModal}>Cancel</Button>
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
                      <Button size='lg' className='display-button' color="info" onClick={this.toggleRestartModal}>Got It</Button>
                    </ModalFooter>
                  </Modal>

                  <Modal size='lg' isOpen={this.state.isCompleteConfirmationModalOpen} toggle={this.toggleCompleteConfirmModal}>
                    <ModalHeader toggle={this.toggleRestartModal}>Complete Confirmation</ModalHeader>
                    <ModalBody>
                      The simulation has been completed and submitted! You can simply close this webpage. If you submitted by mistake or 
                      need to report an error, please contact ninghan2@illinois.edu 
                    </ModalBody>
                    <ModalFooter>
                      <Button size='lg' className='display-button' color="info" onClick={this.close_confirmation}>Got It</Button>
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
                    Transaction Log 1
                </NavLink>
            </NavItem>
            <NavItem>
                <NavLink
                    className={classnames({ active: this.state.activeTab === '3' })}
                    onClick={() => { this.toggle('3'); }}>
                    Transaction Log 2
                </NavLink>
            </NavItem>
            <NavItem>
                <NavLink
                    className={classnames({ active: this.state.activeTab === '4' })}
                    onClick={() => { this.toggle('4'); }}>
                    Transaction Log 3
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
                    Transaction Log 1
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
                    Transaction Log 2
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
                    Transaction Log 3
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
        </TabContent>
          
      </div>

    );
  }
}
export default Financing;
