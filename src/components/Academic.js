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
import { CSVLink } from "react-csv";
import classnames from 'classnames';
import io from "socket.io-client";

const Utils = require('../utils');
let utils = new Utils();

let attendance_display = [];
let greadebook_display = [];
let student_status_display = [];
let students_display = [];
let team_grades_display = [];
let team_comments_display = [];

// A JSON object that keeps track of previous layout changes
let layout_changes = {
  layout_changed: false,
  changes: [] // 1st element: action;  2nd element: index
}

let col_headers = []
let attendance_col_headers = [];
let grade_book_col_headers = [];
let student_status_col_headers = [];
let student_col_headers = [];
let team_grades_col_headers = [];
let team_comments_col_headers = [];
let table_loaded = false;

let user_actions = []
let recorded_time = 0;

let SCROLL_SIZE = 5;

let display_dataset_button = ""

let data = [],  buffer = [], buffer_copy = []
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

let select_i = -1; 
let select_j = -1;

let transaction_button = "";
let pending_changes = {
  data:[], // 2d array to store difference: y, value, x, 
  try_message: "SENT MESSAGE! SUCCESS!", 
  user: ""
}

let socket_id = "";

class Academic extends Component {

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

      isNameModalOpen: false, 
      name: "", 
      curr_table: "attendance", 

      isRestartModalOpen: false, 
      user_actions: [], 

      isCompleteConfirmationModalOpen: false, 

      attendance_table: [[]]
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
        let table = change_table[x][0]; // table corresponds to this change  
        let j = change_table[x][1] - 1   // 0 --> y_coord
        let value = change_table[x][2] // 1 --> actual value
        let i = change_table[x][3] - 1 // 2 --> x_coord

        // reflect each update to its corresponding table
        if (table === "attendance" && typeof attendance_display !== "undefined") {
            attendance_display[i][j] = value;
        } else if (table === "cs225_gradebook") {
            console.log("in grade book");
            greadebook_display[i][j] = value;
        } else if (table === "student_status") {
            student_status_display[i][j] = value;
        } else if (table === "students") {
          students_display[i][j] = value;
        } else if (table === "team_grades") {
          team_grades_display[i][j] = value;
        } else if (table === "team_comments") {
          team_comments_display[i][j] = value;
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
    this.toggleShowHistory = this.toggleShowHistory.bind();
  }

  // fetch 50 rows of data into the buffer
  async componentDidMount() {

    this.socket.on('RECEIVE_FREED_CELLS', function(free_cells_package) {
      update_freed_cells(free_cells_package);
    });

    // function that updates all the cells that do not have any lock anymore. 
    const update_freed_cells = free_cells_package => {
      console.log("received freecell called with: ", free_cells_package);

      let free_cells = free_cells_package.free_cells;
      let disconnect = free_cells_package.disconnect;

      console.log("the free cells are ", free_cells);

      for (var i = 0; i < free_cells.length; i++) {
        let location = free_cells[i];
        if (location[0] === "attendance") {
          console.log("enter here with location: ", location);
          let cell_data = this.hotTableComponent.current.hotInstance.getDataAtCell(location[1], location[2]);

          // update read-only cells
          if (cell_data[0] == "*") {
            let new_data = cell_data.substring(1);
            this.hotTableComponent.current.hotInstance.setDataAtCell(location[1], location[2], new_data);

          } else if (cell_data == "-----" && disconnect == true) {
            data_display[location[0], location[1]] = this.state.data_original[location[1], location[2]];
          }

        } else if (location[0] === "cs225_gradebook") {
          let cell_data = this.hotTableComponent1.current.hotInstance.getDataAtCell(location[1], location[2]);

          // update read-only cells
          if (cell_data[0] == "*") {
            let new_data = cell_data.substring(1);
            this.hotTableComponent1.current.hotInstance.setDataAtCell(location[1], location[2], new_data);

          } else if (cell_data == "-----" && disconnect == true) {
            data_display[location[0], location[1]] = this.state.data_original[location[1], location[2]];
          }

        } else if (location[0] === "student_status") {
          let cell_data = this.hotTableComponent2.current.hotInstance.getDataAtCell(location[1], location[2]);

          // update read-only cells
          if (cell_data[0] == "*") {
            let new_data = cell_data.substring(1);
            this.hotTableComponent2.current.hotInstance.setDataAtCell(location[1], location[2], new_data);

          } else if (cell_data == "-----" && disconnect == true) {
            data_display[location[0], location[1]] = this.state.data_original[location[1], location[2]];
          }

        } else if (location[0] === "students") {
          let cell_data = this.hotTableComponent3.current.hotInstance.getDataAtCell(location[1], location[2]);

          // update read-only cells
          if (cell_data[0] == "*") {
            let new_data = cell_data.substring(1);
            this.hotTableComponent3.current.hotInstance.setDataAtCell(location[1], location[2], new_data);

          } else if (cell_data == "-----" && disconnect == true) {
            data_display[location[0], location[1]] = this.state.data_original[location[1], location[2]];
          }

        } else if (location[0] === "team_grades") {
          let cell_data = this.hotTableComponent4.current.hotInstance.getDataAtCell(location[1], location[2]);

          // update read-only cells
          if (cell_data[0] == "*") {
            let new_data = cell_data.substring(1);
            this.hotTableComponent4.current.hotInstance.setDataAtCell(location[1], location[2], new_data);

          } else if (cell_data == "-----" && disconnect == true) {
            data_display[location[0], location[1]] = this.state.data_original[location[1], location[2]];
          }

        }
      }
      cell_read_only();
    }

    this.socket.on('REQUEST_SHARED_ACCEPT', function(shared_lock_accept) {
      let table = shared_lock_accept.table;
      let row = shared_lock_accept.row;
      let col = shared_lock_accept.col;

      display_shared_lock(table, row, col);

    });

    // the function that turns a cell into read-only due to a read lock
    const cell_read_only = () => {
      
        this.hotTableComponent.current.hotInstance.updateSettings({
            cells: function(row, col, prop){
            var cellProperties = {};
              if(attendance_display[row][col] !== null && attendance_display[row][col].length !== 0 &&  (attendance_display[row][col] == "-----" || attendance_display[row][col].charAt(0) === "*")){
                cellProperties.readOnly = 'true'
              }
            return cellProperties
          }
        });

      
        this.hotTableComponent1.current.hotInstance.updateSettings({
            cells: function(row, col, prop){
            var cellProperties = {};
              if(greadebook_display[row][col] !== null && greadebook_display[row][col].length !== 0 &&  (greadebook_display[row][col] == "-----" || greadebook_display[row][col].charAt(0) === "*")){
                cellProperties.readOnly = 'true'
              }
            return cellProperties
          }
        });

      
        this.hotTableComponent2.current.hotInstance.updateSettings({
            cells: function(row, col, prop){
            var cellProperties = {};
              if(student_status_display[row][col] !== null && student_status_display[row][col].length !== 0 &&  (student_status_display[row][col] == "-----" || student_status_display[row][col].charAt(0) === "*")){
                cellProperties.readOnly = 'true'
              }
            return cellProperties
          }
        });

      
        this.hotTableComponent3.current.hotInstance.updateSettings({
            cells: function(row, col, prop){
            var cellProperties = {};
              if(students_display[row][col] !== null && students_display[row][col].length !== 0 &&  (students_display[row][col] == "-----" || students_display[row][col].charAt(0) === "*")){
                cellProperties.readOnly = 'true'
              }
            return cellProperties
          }
        });

      
        this.hotTableComponent4.current.hotInstance.updateSettings({
            cells: function(row, col, prop){
            var cellProperties = {};
              if(team_grades_display[row][col] !== null && team_grades_display[row][col].length !== 0 &&  (team_grades_display[row][col] == "-----" || team_grades_display[row][col].charAt(0) === "*")){
                cellProperties.readOnly = 'true'
              }
            return cellProperties
          }
        }); 
    }

    // Function that accept the position of a new shared lock and display it
    const display_shared_lock = (table, row, col) => {

      if (table === "attendance") {
        let cell_data = this.hotTableComponent.current.hotInstance.getDataAtCell(row, col);
        // if there is a shared lock displaying already, do nothing
        if (cell_data.charAt(0) === "*") {
          return;
        } else {
          let new_data = "*" + cell_data
          this.hotTableComponent.current.hotInstance.setDataAtCell(row, col, new_data);
        }

      } else if (table === "cs225_gradebook") {
        let cell_data = this.hotTableComponent1.current.hotInstance.getDataAtCell(row, col);
        // if there is a shared lock displaying already, do nothing
        if (cell_data.charAt(0) === "*") {
          return;
        } else {
          let new_data = "*" + cell_data
          this.hotTableComponent1.current.hotInstance.setDataAtCell(row, col, new_data);
        }

      } else if (table === "student_status") {
        let cell_data = this.hotTableComponent2.current.hotInstance.getDataAtCell(row, col);
        // if there is a shared lock displaying already, do nothing
        if (cell_data.charAt(0) === "*") {
          return;
        } else {
          let new_data = "*" + cell_data
          this.hotTableComponent2.current.hotInstance.setDataAtCell(row, col, new_data);
        }

      } else if (table === "students") {
        let cell_data = this.hotTableComponent3.current.hotInstance.getDataAtCell(row, col);
        // if there is a shared lock displaying already, do nothing
        if (cell_data.charAt(0) === "*") {
          return;
        } else {
          let new_data = "*" + cell_data
          this.hotTableComponent3.current.hotInstance.setDataAtCell(row, col, new_data);
        }

      } else if (table === "team_grades") {
        let cell_data = this.hotTableComponent4.current.hotInstance.getDataAtCell(row, col);
        // if there is a shared lock displaying already, do nothing
        if (cell_data.charAt(0) === "*") {
          return;
        } else {
          let new_data = "*" + cell_data
          this.hotTableComponent4.current.hotInstance.setDataAtCell(row, col, new_data);
        }
      }
      cell_read_only();
    }

    recorded_time = Date.now() / 1000;

    // display_dataset_button = <Button size='lg' className='display-button' color="primary" onClick={this.display} >Display Dataset</Button> 
    transaction_button = <Button size='lg' className='display-button' color="primary" onClick={this.start_transaction} >Start Transaction</Button>


    // FIRST COMPONENT REF ========================================================================================
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

    // SECOND COMPONENT REF ========================================================================================
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

    // THIRD COMPONENT REF ========================================================================================
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

    // FOURTH COMPONENT REF ========================================================================================
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

    // FIFTH COMPONENT REF ========================================================================================
    this.hotTableComponent4.current.hotInstance.addHook('afterChange', function(chn, src) {
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

    this.hotTableComponent4.current.hotInstance.addHook('afterCreateRow', function(index, amount, source) {
      console.log("insert index is: ", index);
      if (source === "ContextMenu.rowBelow") {
        layout_changes.layout_changed = true;
        layout_changes.changes.push(["insert_r", "below", index]);
      } else {
        layout_changes.layout_changed = true;
        layout_changes.changes.push(["insert_r", "above", index]);
      }
    });

    this.hotTableComponent4.current.hotInstance.addHook('afterCreateCol', function(index, amount, source) {
      console.log("insert index is: ", index);
      if (source === "ContextMenu.columnRight") {
        layout_changes.layout_changed = true;
        layout_changes.changes.push(["insert_c", "right", index]);
      } else {
        layout_changes.layout_changed = true;
        layout_changes.changes.push(["insert_c", "left", index]);
      }
    });

    this.hotTableComponent4.current.hotInstance.addHook('afterRemoveRow', function(index, amount, physicalRows, source) {
      layout_changes.layout_changed = true;
      layout_changes.changes.push(["remove_r", null, index]);
    });

    this.hotTableComponent4.current.hotInstance.addHook('afterRemoveCol', function(index, amount, physicalRows, source) {
      layout_changes.layout_changed = true;
      layout_changes.changes.push(["remove_c", null, index]);
    });

    // SIXTH COMPONENT REF ========================================================================================
    this.hotTableComponent5.current.hotInstance.addHook('afterChange', function(chn, src) {
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

    this.hotTableComponent5.current.hotInstance.addHook('afterBeginEditing', function(row, col) {

      // record the currently editing location and state. 
      current_i = row;
      current_j = col;
    });

    this.hotTableComponent5.current.hotInstance.addHook('afterSelection', function(row, column, row2, column2, preventScrolling, selectionLayerLevel) {

      // record the currently editing location and state. 
      select_i = row;
      select_j = column;
      currently_editing = true;
    });

    this.hotTableComponent5.current.hotInstance.addHook('afterCreateRow', function(index, amount, source) {
      console.log("insert index is: ", index);
      if (source === "ContextMenu.rowBelow") {
        layout_changes.layout_changed = true;
        layout_changes.changes.push(["insert_r", "below", index]);
      } else {
        layout_changes.layout_changed = true;
        layout_changes.changes.push(["insert_r", "above", index]);
      }
    });

    this.hotTableComponent5.current.hotInstance.addHook('afterCreateCol', function(index, amount, source) {
      console.log("insert index is: ", index);
      if (source === "ContextMenu.columnRight") {
        layout_changes.layout_changed = true;
        layout_changes.changes.push(["insert_c", "right", index]);
      } else {
        layout_changes.layout_changed = true;
        layout_changes.changes.push(["insert_c", "left", index]);
      }
    });

    this.hotTableComponent5.current.hotInstance.addHook('afterRemoveRow', function(index, amount, physicalRows, source) {
      layout_changes.layout_changed = true;
      layout_changes.changes.push(["remove_r", null, index]);
    });

    this.hotTableComponent5.current.hotInstance.addHook('afterRemoveCol', function(index, amount, physicalRows, source) {
      layout_changes.layout_changed = true;
      layout_changes.changes.push(["remove_c", null, index]);
    });
  }

  

  componentWillUnmount() {
    this.socket.disconnect();
  }

  toggleShowHistory = () => {
    this.setState({
      isShowHistoryOpen: !this.state.isShowHistoryOpen
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
      
      pending_changes.user = this.state.user_name
  
      let temp = [];
      let y_coord = parseInt(chn_copy[0][0]) + 1;
      let x_coord = parseInt(chn_copy[0][1]) + 1;
      let actual_value = chn_copy[0][3];
      temp[0] = this.state.curr_table;
      temp[1] = x_coord;
      temp[2] = actual_value;
      temp[3] = y_coord;
      
      // find the correct attribute
      if (this.state.curr_table === "attendance") {
        temp[4] = attendance_col_headers[x_coord - 1];
      } else if (this.state.curr_table === "cs225_gradebook") {
        temp[4] = grade_book_col_headers[x_coord - 1];
      } else if (this.state.curr_table === "student_status") {
        temp[4] = student_status_col_headers[x_coord - 1];
      } else if (this.state.curr_table === "students") {
        temp[4] = student_col_headers[x_coord - 1];
      } else if (this.state.curr_table === "team_grades") {
        temp[4] = team_grades_col_headers[x_coord - 1];
      } else if (this.state.curr_table === "team_comments") {
        temp[4] = team_comments_col_headers[x_coord - 1];
      }

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

  end_transaction = () => {
    this.setState({
      transaction_mode: false
    });
    transaction_button = <Button size='lg' className='display-button' color="primary" onClick={this.start_transaction} >Start Transaction</Button>

    // signal backend to release locks
    this.socket.emit('FINISH_TRANSACTION');

    // send updates to socket
    setTimeout(() => {
      user_actions.push(["END_TRANSACTION", "END_TRANSACTION", "END_TRANSACTION", "END_TRANSACTION", "END_TRANSACTION", "END_TRANSACTION", "END_TRANSACTION", "END_TRANSACTION", "END_TRANSACTION"]);
      this.commit_transaction();

      // send updates to the database
      const requestOptions = {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({pending_changes})
      };
      fetch('https://spreadsheetactions.herokuapp.com/academic/update', requestOptions,  {mode: 'no-cors'})
    }, 500);
  }

  commit_transaction = () => {
    this.socket.emit('SEND_MESSAGE', pending_changes);
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

      console.log("i'm scorlling rn!!!");

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
    fetch('https://spreadsheetactions.herokuapp.com/training/send-training-data/academic', requestOptions,  {mode: 'no-cors'})

    // bring up confirmation modal
    this.toggleCompleteConfirmModal();
  }

  select_simulation = (e) => {
    // e.preventDefault();
    console.log("called this function with: ", e.target.name)
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
    if (tab === '1') {  
      this.setState({
        curr_table: "attendance" 
      })
      col_headers = attendance_col_headers;
      
    } else if (tab === '2') {
      this.setState({
        curr_table: "cs225_gradebook"
      })
      col_headers = grade_book_col_headers;

    } else if (tab === '3') {
      this.setState({
        curr_table: "student_status"
      })
      col_headers = student_status_col_headers;

    } else if (tab === '4') {
      this.setState({
        curr_table: "students"
      });
      col_headers = student_col_headers;

    } else if (tab === '5') {
      this.setState({
        curr_table: "team_grades"
      });
      col_headers = team_grades_col_headers;

    } else if (tab === '6') {
      this.setState({
        curr_table: "team_comments"
      });
      col_headers = team_comments_col_headers;
    }
  }

  load_tables = (e) => {
    e.preventDefault();
    if (table_loaded) {
      this.toggleInstructionModal();
    } else {
      table_loaded = true;
      utils.load_simulation_v2(1, "attendance", attendance_display, buffer_copy, attendance_col_headers);
      utils.load_simulation_v2(1, "grade_book", greadebook_display, buffer_copy, grade_book_col_headers);
      utils.load_simulation_v2(1, "student_status", student_status_display, buffer_copy, student_status_col_headers);
      utils.load_simulation_v2(1, "students", students_display, buffer_copy, student_col_headers);
      utils.load_simulation_v2(1, "team_grades", team_grades_display, buffer_copy, team_grades_col_headers);
      utils.load_simulation_v2(1, "team_comments", team_comments_display, buffer_copy, team_comments_col_headers);
      setTimeout(() => {
          attendance_display = [attendance_col_headers].concat(attendance_display);
          greadebook_display = [grade_book_col_headers].concat(greadebook_display);
          student_status_display = [student_status_col_headers].concat(student_status_display);
          students_display = [student_col_headers].concat(students_display);
          team_grades_display = [team_grades_col_headers].concat(team_grades_display);
          team_comments_display = [team_comments_col_headers].concat(team_comments_display);
          this.setState({
            isInstructionOpen: false
          })
      }, 2000);
      col_headers = attendance_col_headers;
      this.setState({
        isNameModalOpen: true
      })
    }
  }

  reload_tables = () => {
    table_loaded = true;
    utils.load_simulation_v2(1, "attendance", attendance_display, buffer_copy, attendance_col_headers);
    utils.load_simulation_v2(1, "grade_book", greadebook_display, buffer_copy, grade_book_col_headers);
    utils.load_simulation_v2(1, "student_status", student_status_display, buffer_copy, student_status_col_headers);
    utils.load_simulation_v2(1, "students", students_display, buffer_copy, student_col_headers);
    utils.load_simulation_v2(1, "team_grades", team_grades_display, buffer_copy, team_grades_col_headers);
    utils.load_simulation_v2(1, "team_comments", team_comments_display, buffer_copy, team_comments_col_headers);
    setTimeout(() => {
        attendance_display = [attendance_col_headers].concat(attendance_display);
        greadebook_display = [grade_book_col_headers].concat(greadebook_display);
        student_status_display = [student_status_col_headers].concat(student_status_display);
        students_display = [student_col_headers].concat(students_display);
        team_grades_display = [team_grades_col_headers].concat(team_grades_display);
        team_comments_display = [team_comments_col_headers].concat(team_comments_display);
        this.setState({
          attendance_table: attendance_display
        })
    }, 2000);
    col_headers = attendance_col_headers;
  }

  redirect = (e) => {
    e.preventDefault();
    this.setState({
      redirect: true
    })

    // reset all display
    attendance_display = [];
    greadebook_display = [];
    student_status_display = [];
    attendance_col_headers = [];
    grade_book_col_headers = [];
    student_status_col_headers = [];

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
      simulation: "academic"
    }
    this.socket.emit('SEND_USERNAME', name_package);
    console.log("sending user name");
    this.toggleNameModal();
  }

  restart = () => {
    // reset all display
    attendance_display = [];
    greadebook_display = [];
    student_status_display = [];
    attendance_col_headers = [];
    grade_book_col_headers = [];
    student_status_col_headers = [];
    student_col_headers = [];

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

  download = () => {
    console.log("downloading!!!!");
    user_actions.push([this.state.name, "END_TRAINING_DATA", null, null, null, this.state.curr_table, null, null, "END"]);
    this.setState({
      user_actions: user_actions
    })
    this.csvLink.link.click()
  }

  close_confirmation = () => {
    user_actions = []
    this.toggleCompleteConfirmModal();
  }

  request_read_lock = () => {
    let shared_lock_request = {
      row: select_i,
      col: select_j, 
      table: this.state.curr_table
    }
    this.socket.emit('REQUEST_SHARED_LOCK', shared_lock_request);
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
          {/* <ButtonDropdown isOpen={this.state.collapsed} toggle={this.toggleNavbar} style={{float: 'left'}} className="up-margin-one">
                <DropdownToggle color="#61dafb"  caret style={{float: 'right'}}>
                  Change Simulation
                </DropdownToggle>
                <DropdownMenu>
                  <DropdownItem name="financing" id="financing" onClick={e => this.select_simulation(e)}>Financing Simulation</DropdownItem>
                  <DropdownItem divider />
                  <DropdownItem name="management" id="management" onClick={e => this.select_simulation(e)}>Management Simulation</DropdownItem>
                </DropdownMenu>
            </ButtonDropdown> */}
          </Jumbotron >
          <div>
            <Jumbotron >
                  <h1 className="display-3">Hi {this.state.name}, welcome to Academic Simulation!</h1>
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
                    {/* &nbsp;&nbsp;&nbsp;&nbsp;
                    <Button size='lg' className='display-button' color="info" onClick={this.request_read_lock} >Read Lock</Button> */}
                  </p>
                  {this.state.edit_message}

                  <Modal size='lg' isOpen={this.state.isInstructionOpen} >
                    {/* <ModalHeader ><header>Simulation Instruction</header>  </ModalHeader> */}
                    <ModalBody>
                        <h2>Welcome</h2>
                        Welcome to Academic Simulation! This instruction can be accessed at any time by clicking the "Instruction" button on this webpage. 
                        Under this simulation, there are three tables: "Attendance" table, "Gradebook" table, and a "Student Status" table. This simulation has two parts.  
                        <hr className="my-2" />
                        

                        <p className="margin-one">
                        <h2>Part 1</h2>
                        You are going to simulate a 5-day period of attendance taking based on “Story 1” under the “Story” section in the instruction document.
                        As you go through the events in "Story 1", you are going to fill out the "Attendance" table and update the "Student Status" table. In the 
                        "Attendance" table, a student can be “Present”, “Tardy”, “Absent”, or “Excused”. Whether to enter those exact words or their initials (i.e. 
                        “P”, “T”, “A”, “E”) is your choice, but a student can only be in one of these four states. When you are updating the "Student Status" table, please
                        follow the rules described in the instruction document. Further details of the instruction are also included in that document we sent you via email. 
                        If you did not received the document, please contact ninghan2@illinois.edu.
                        <br/>
                        <h5>Note: </h5>
                        After you finish this part, press the “Complete Simulation” button on your screen and start the next part.  
                        </p>
                        <hr className="my-2" />


                        <p className="margin-one">
                        <h2>Part 2</h2>
                        In this part. you are going to fill out the "Gradebook" table and update the "Student Status" table based on the events described in "Story 2" under the 
                        "Story" section in the instruction document. For the "Gradebook" table, you will need to fill out the grade for each assignment for every student as each 
                        assignment dues. At the end of the story (i.e. end of the semester), you will need to calculate the final grade for each student. The final grade is 
                        calculated as (total_points_earned/total_possible_points) * 100, where the total_points_earned is the sum of the points from all assignments, and the 
                        total_possible_ponts is 1000. For example, if a student earned a total of 850 points, the final grade will be 85. After the semester ends and after you 
                        calculate the final grades for each student, you are going to update the Student Status table (the same table you worked on in Part 1). The rules for how to 
                        update it are described in the instruction document. Further details of the instruction are also included in that document we sent you via email. If you did not 
                        received the document, please contact ninghan2@illinois.edu.
                        <br/>
                        <h5>Note: </h5>
                        After you finish this part, press the “Complete Simulation” button on your screen.  
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
                      The current part of the simulation has been completed and submitted. If you have completed Part 1, you can work on Part 2 now. 
                      If you have completed Part 2, you can simply close this webpage. If you submitted by mistake or you need to report an error, please contact ninghan2@illinois.edu 
                    </ModalBody>
                    <ModalFooter>
                      <Button size='lg' className='display-button' color="info" onClick={this.close_confirmation}>Got It</Button>
                    </ModalFooter>
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
                  
                        
            </Jumbotron>
        </div>
        {/* <hr /> */}

        <Nav tabs>
            <NavItem>
                <NavLink
                    className={classnames({ active: this.state.activeTab === '1' })}
                    onClick={() => { this.toggle('1'); }}>
                    Attendance Table
                </NavLink>
            </NavItem>
            <NavItem>
                <NavLink
                    className={classnames({ active: this.state.activeTab === '2' })}
                    onClick={() => { this.toggle('2'); }}>
                    Gradebook
                </NavLink>
            </NavItem>
            <NavItem>
                <NavLink
                    className={classnames({ active: this.state.activeTab === '3' })}
                    onClick={() => { this.toggle('3'); }}>
                    Student Status
                </NavLink>
            </NavItem>
            <NavItem>
                <NavLink
                    className={classnames({ active: this.state.activeTab === '4' })}
                    onClick={() => { this.toggle('4'); }}>
                    Students
                </NavLink>
            </NavItem>
            <NavItem>
                <NavLink
                    className={classnames({ active: this.state.activeTab === '5' })}
                    onClick={() => { this.toggle('5'); }}>
                    Team Grades
                </NavLink>
            </NavItem>
            <NavItem>
                <NavLink
                    className={classnames({ active: this.state.activeTab === '6' })}
                    onClick={() => { this.toggle('6'); }}>
                    Team Comments
                </NavLink>
            </NavItem>
        </Nav>
        <TabContent activeTab={this.state.activeTab}>
            <TabPane tabId="1">
                <h4>
                    Attendance
                </h4> 
                <div id = "display_portion" onScrollCapture={e => this.track_action(e, "scroll")}  tabIndex="1">
                    <HotTable className="handsontable" id ="display_table" data={attendance_display} ref={this.hotTableComponent} id={this.id}
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
                    Gradebook
                </h4> 
                <div id = "display_portion" onScrollCapture={e => this.track_action(e, "scroll")}  tabIndex="2">
                    <HotTable className="handsontable" id ="display_table" data={greadebook_display} ref={this.hotTableComponent1} id={this.id}
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
                    Student Status Table
                </h4> 
                <div id = "display_portion" onScrollCapture={e => this.track_action(e, "scroll")}  tabIndex="3">
                    <HotTable className="handsontable" id ="display_table" data={student_status_display} ref={this.hotTableComponent2} id={this.id}
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
                    Students Table
                </h4> 
                <div id = "display_portion" onScrollCapture={e => this.track_action(e, "scroll")}  tabIndex="4">
                    <HotTable className="handsontable" id ="display_table" data={students_display} ref={this.hotTableComponent3} id={this.id}
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
                    Team Grades
                </h4> 
                <div id = "display_portion" onScrollCapture={e => this.track_action(e, "scroll")}  tabIndex="5">
                    <HotTable className="handsontable" id ="display_table" data={team_grades_display} ref={this.hotTableComponent4} id={this.id}
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
            <TabPane tabId="6">
                <h4>
                    Team Comments
                </h4> 
                <div id = "display_portion" onScrollCapture={e => this.track_action(e, "scroll")}  tabIndex="6">
                    <HotTable className="handsontable" id ="display_table" data={team_comments_display} ref={this.hotTableComponent5} id={this.id}
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
export default Academic;
