class Utils {
    load_simulation = (index, simulation_type, buffer, buffer_copy, col_headers) => {
        console.log("simulation type is: ", simulation_type);
        this.fill_col_headers(col_headers, simulation_type);
        let simulation = "";
        if (simulation_type == "attendance" || simulation_type == "grade_book") {
            simulation = "academic";
        }
        else if (simulation_type == "employee_schedule_v1" || simulation_type == "employee_schedule_v2" || simulation_type == "progress_log") {
            simulation = "management";
        } else if (simulation_type == "check_book" || simulation_type == "monthly_expense" || simulation_type == "monthly_income") {
            simulation = "financing";
        }

        let ATT_NUM = 0;
        if (simulation_type == "attendance") {
            ATT_NUM = 9;
        } else if (simulation_type == "grade_book") {
            ATT_NUM = 17;
        }
        else if (simulation_type == "check_book") {
            ATT_NUM = 7;
        } else if (simulation_type == "monthly_expense") {
            ATT_NUM = 14;
        } else if (simulation_type == "monthly_income") {
            ATT_NUM = 14;
        } else if (simulation_type == "employee_schedule_v1") {
            ATT_NUM = 9;
        } else if (simulation_type == "employee_schedule_v2") {
            ATT_NUM = 8;
        } else if (simulation_type == "progress_log") {
            ATT_NUM = 7;
        }

        let url = '/' + simulation + '/' + simulation_type + '/fetch-fifty-rows/' + index
        fetch(url)
        .then(res => res.json())      
        .then(data => {
            if (data.length === 0) {
                console.log("No data is fetched by fetchMoreRows function");
                this.add_empty_rows(50, ATT_NUM, buffer, buffer_copy);
            } else {
                
                //load returned data into the buffer
                for (var i = 0; i < data.length; i++) {

                    var temp = []
                    for (var j = 0; j < ATT_NUM; j++) {
                        if (simulation_type == "attendance") {  // attendance
                            if (j == 0) {
                                temp[j] = data[i]['ID'];
                            }
                            else if (j == 1) {
                                temp[j] = data[i]['name'];
                            }
                            else {
                                temp[j] = "";
                            }
                        }
                        if (simulation_type == "grade_book") {      // grade book 
                            if (j == 0) {temp[j] = data[i]['ID']}
                            if (j == 1) {temp[j] = data[i]['name']}
                            if (j == 2) {temp[j] = data[i]['MP1']}
                            if (j == 3) {temp[j] = data[i]['MP2']}
                            if (j == 4) {temp[j] = data[i]['MP3']}
                            if (j == 5) {temp[j] = data[i]['MP4']}
                            if (j == 6) {temp[j] = data[i]['Lab1']}
                            if (j == 7) {temp[j] = data[i]['Lab2']}
                            if (j == 8) {temp[j] = data[i]['Lab3']}
                            if (j == 9) {temp[j] = data[i]['Lab4']}
                            if (j == 10) {temp[j] = data[i]['Lab5']}
                            if (j == 11) {temp[j] = data[i]['Lab6']}
                            if (j == 12) {temp[j] = data[i]['Lab7']}
                            if (j == 13) {temp[j] = data[i]['Exam1']}
                            if (j == 14) {temp[j] = data[i]['Exam2']}
                            if (j == 15) {temp[j] = data[i]['Final']}
                            if (j == 16) {temp[j] = data[i]['Overall']}
                        } else if (simulation_type == "check_book") {    // check book
                            if (j == 0) {temp[j] = data[i]['id']}
                            if (j == 1) {temp[j] = data[i]['number']}
                            if (j == 2) {temp[j] = data[i]['date']}
                            if (j == 3) {temp[j] = data[i]['transaction']}
                            if (j == 4) {temp[j] = data[i]['withdraw']}
                            if (j == 5) {temp[j] = data[i]['deposit']}
                            if (j == 6) {temp[j] = data[i]['balance']}
                        } else if (simulation_type == "monthly_expense") { // monthly expense
                            if (j == 0) {temp[j] = data[i]['id']}
                            if (j == 1) {temp[j] = data[i]['expenses']}
                            if (j == 2) {temp[j] = data[i]['Jan']}
                            if (j == 3) {temp[j] = data[i]['Feb']}
                            if (j == 4) {temp[j] = data[i]['Mar']}
                            if (j == 5) {temp[j] = data[i]['Apr']}
                            if (j == 6) {temp[j] = data[i]['May']}
                            if (j == 7) {temp[j] = data[i]['Jun']}
                            if (j == 8) {temp[j] = data[i]['Jul']}
                            if (j == 9) {temp[j] = data[i]['Aug']}
                            if (j == 10) {temp[j] = data[i]['Sep']}
                            if (j == 11) {temp[j] = data[i]['Oct']}
                            if (j == 12) {temp[j] = data[i]['Nov']}
                            if (j == 13) {temp[j] = data[i]['Dec']}
                        } else if (simulation_type == "monthly_income") { // monthly income
                            if (j == 0) {temp[j] = data[i]['id']}
                            if (j == 1) {temp[j] = data[i]['income_type']}
                            if (j == 2) {temp[j] = data[i]['Jan']}
                            if (j == 3) {temp[j] = data[i]['Feb']}
                            if (j == 4) {temp[j] = data[i]['Mar']}
                            if (j == 5) {temp[j] = data[i]['Apr']}
                            if (j == 6) {temp[j] = data[i]['May']}
                            if (j == 7) {temp[j] = data[i]['Jun']}
                            if (j == 8) {temp[j] = data[i]['Jul']}
                            if (j == 9) {temp[j] = data[i]['Aug']}
                            if (j == 10) {temp[j] = data[i]['Sep']}
                            if (j == 11) {temp[j] = data[i]['Oct']}
                            if (j == 12) {temp[j] = data[i]['Nov']}
                            if (j == 13) {temp[j] = data[i]['Dec']}
                        } else if (simulation_type == "employee_schedule_v1") {   // schedule v1
                            if (j == 0) {temp[j] = data[i]['emp_id']}
                            if (j == 1) {temp[j] = data[i]['name']}
                            if (j == 2) {temp[j] = data[i]['Monday']}
                            if (j == 3) {temp[j] = data[i]['Tuesday']}
                            if (j == 4) {temp[j] = data[i]['Wednesday']}
                            if (j == 5) {temp[j] = data[i]['Thursday']}
                            if (j == 6) {temp[j] = data[i]['Friday']}
                            if (j == 7) {temp[j] = data[i]['Saturday']}
                            if (j == 8) {temp[j] = data[i]['Sunday']}
                        } else if (simulation_type == "employee_schedule_v2") {   // schedule v2
                            if (j == 1) {temp[j] = data[i]['time_slot']}
                            if (j == 2) {temp[j] = data[i]['Monday']}
                            if (j == 3) {temp[j] = data[i]['Tuesday']}
                            if (j == 4) {temp[j] = data[i]['Wednesday']}
                            if (j == 5) {temp[j] = data[i]['Thursday']}
                            if (j == 6) {temp[j] = data[i]['Friday']}
                            if (j == 7) {temp[j] = data[i]['Saturday']}
                            if (j == 8) {temp[j] = data[i]['Sunday']}
                        } else if (simulation_type == "progress_log") {  // progress log
                            if (j == 0) {temp[j] = data[i]['task_id']}
                            if (j == 1) {temp[j] = data[i]['task']}
                            if (j == 2) {temp[j] = data[i]['deadline']}
                            if (j == 3) {temp[j] = data[i]['emp_id']}
                            if (j == 4) {temp[j] = data[i]['name']}
                            if (j == 5) {temp[j] = data[i]['hour_spent']}
                            if (j == 6) {temp[j] = data[i]['progress']}
                        }
                    }

                    buffer[i] = temp;
                    buffer_copy[i] = temp.slice()
                    // return buffer;
                }

                this.add_empty_rows(10, ATT_NUM, buffer, buffer_copy);
            }
        });
    }

    load_simulation_v2 = (index, simulation_type, buffer, buffer_copy, col_headers) => {
        console.log("simulation type is: ", simulation_type);
        this.fill_col_headers(col_headers, simulation_type);
        // buffer.push(col_headers);
        let simulation = "";
        if (simulation_type == "attendance" || simulation_type == "grade_book" || simulation_type == "student_status") {
            simulation = "academic";
        }
        else if (simulation_type == "employee_schedule_v1" || simulation_type == "employee_schedule_v2" || simulation_type == "progress_log") {
            simulation = "management";
        } else if (simulation_type == "check_book" || simulation_type == "monthly_expense" || simulation_type == "monthly_income") {
            simulation = "financing";
        }

        let ATT_NUM = 0;
        if (simulation_type == "attendance") {
            ATT_NUM = 9;
        } else if (simulation_type == "grade_book") {
            ATT_NUM = 17;
        }
        else if (simulation_type == "check_book") {
            ATT_NUM = 7;
        } else if (simulation_type == "monthly_expense") {
            ATT_NUM = 14;
        } else if (simulation_type == "monthly_income") {
            ATT_NUM = 14;
        } else if (simulation_type == "employee_schedule_v1") {
            ATT_NUM = 9;
        } else if (simulation_type == "employee_schedule_v2") {
            ATT_NUM = 8;
        } else if (simulation_type == "progress_log") {
            ATT_NUM = 7;
        } else if (simulation_type == "student_status") {
            ATT_NUM = 6;
        }

        let url = '/' + simulation + '/' + simulation_type + '/fetch-fifty-rows/' + index
        fetch(url)
        .then(res => res.json())      
        .then(data => {
            if (data.length === 0) {
                console.log("No data is fetched by fetchMoreRows function");
                this.add_empty_rows(50, ATT_NUM, buffer, buffer_copy);
            } else {
                console.log(data)
                //load returned data into the buffer
                for (var i = 0; i < data.length; i++) {

                    var temp = []
                    for (var j = 0; j < ATT_NUM; j++) {
                        if (simulation_type == "attendance") {  // attendance
                            if (j == 0) {
                                temp[j] = data[i]['ID'];
                            }
                            else if (j == 1) {
                                temp[j] = data[i]['name'];
                            }
                            else {
                                temp[j] = "";
                            }
                        }
                        if (simulation_type == "grade_book") {      // grade book 
                            if (j == 0) {temp[j] = data[i]['ID']}
                            if (j == 1) {temp[j] = data[i]['name']}
                            if (j == 2) {temp[j] = data[i]['MP1']}
                            if (j == 3) {temp[j] = data[i]['MP2']}
                            if (j == 4) {temp[j] = data[i]['MP3']}
                            if (j == 5) {temp[j] = data[i]['MP4']}
                            if (j == 6) {temp[j] = data[i]['Lab1']}
                            if (j == 7) {temp[j] = data[i]['Lab2']}
                            if (j == 8) {temp[j] = data[i]['Lab3']}
                            if (j == 9) {temp[j] = data[i]['Lab4']}
                            if (j == 10) {temp[j] = data[i]['Lab5']}
                            if (j == 11) {temp[j] = data[i]['Lab6']}
                            if (j == 12) {temp[j] = data[i]['Lab7']}
                            if (j == 13) {temp[j] = data[i]['Exam1']}
                            if (j == 14) {temp[j] = data[i]['Exam2']}
                            if (j == 15) {temp[j] = data[i]['Final']}
                            if (j == 16) {temp[j] = data[i]['Overall']}
                        } else if (simulation_type == "check_book") {    // check book
                            if (j == 0) {temp[j] = data[i]['id']}
                            if (j == 1) {temp[j] = data[i]['number']}
                            if (j == 2) {temp[j] = data[i]['date']}
                            if (j == 3) {temp[j] = data[i]['transaction']}
                            if (j == 4) {temp[j] = data[i]['withdraw']}
                            if (j == 5) {temp[j] = data[i]['deposit']}
                            if (j == 6) {temp[j] = data[i]['balance']}
                        } else if (simulation_type == "monthly_expense") { // monthly expense
                            if (j == 0) {temp[j] = data[i]['id']}
                            if (j == 1) {temp[j] = data[i]['expenses']}
                            if (j == 2) {temp[j] = data[i]['Jan']}
                            if (j == 3) {temp[j] = data[i]['Feb']}
                            if (j == 4) {temp[j] = data[i]['Mar']}
                            if (j == 5) {temp[j] = data[i]['Apr']}
                            if (j == 6) {temp[j] = data[i]['May']}
                            if (j == 7) {temp[j] = data[i]['Jun']}
                            if (j == 8) {temp[j] = data[i]['Jul']}
                            if (j == 9) {temp[j] = data[i]['Aug']}
                            if (j == 10) {temp[j] = data[i]['Sep']}
                            if (j == 11) {temp[j] = data[i]['Oct']}
                            if (j == 12) {temp[j] = data[i]['Nov']}
                            if (j == 13) {temp[j] = data[i]['Dec']}
                        } else if (simulation_type == "monthly_income") { // monthly income
                            if (j == 0) {temp[j] = data[i]['id']}
                            if (j == 1) {temp[j] = data[i]['income_type']}
                            if (j == 2) {temp[j] = data[i]['Jan']}
                            if (j == 3) {temp[j] = data[i]['Feb']}
                            if (j == 4) {temp[j] = data[i]['Mar']}
                            if (j == 5) {temp[j] = data[i]['Apr']}
                            if (j == 6) {temp[j] = data[i]['May']}
                            if (j == 7) {temp[j] = data[i]['Jun']}
                            if (j == 8) {temp[j] = data[i]['Jul']}
                            if (j == 9) {temp[j] = data[i]['Aug']}
                            if (j == 10) {temp[j] = data[i]['Sep']}
                            if (j == 11) {temp[j] = data[i]['Oct']}
                            if (j == 12) {temp[j] = data[i]['Nov']}
                            if (j == 13) {temp[j] = data[i]['Dec']}
                        } else if (simulation_type == "employee_schedule_v1") {   // schedule v1
                            if (j == 0) {temp[j] = data[i]['emp_id']}
                            if (j == 1) {temp[j] = data[i]['name']}
                            if (j == 2) {temp[j] = data[i]['Monday']}
                            if (j == 3) {temp[j] = data[i]['Tuesday']}
                            if (j == 4) {temp[j] = data[i]['Wednesday']}
                            if (j == 5) {temp[j] = data[i]['Thursday']}
                            if (j == 6) {temp[j] = data[i]['Friday']}
                            if (j == 7) {temp[j] = data[i]['Saturday']}
                            if (j == 8) {temp[j] = data[i]['Sunday']}
                        } else if (simulation_type == "employee_schedule_v2") {   // schedule v2
                            if (j == 1) {temp[j] = data[i]['time_slot']}
                            if (j == 2) {temp[j] = data[i]['Monday']}
                            if (j == 3) {temp[j] = data[i]['Tuesday']}
                            if (j == 4) {temp[j] = data[i]['Wednesday']}
                            if (j == 5) {temp[j] = data[i]['Thursday']}
                            if (j == 6) {temp[j] = data[i]['Friday']}
                            if (j == 7) {temp[j] = data[i]['Saturday']}
                            if (j == 8) {temp[j] = data[i]['Sunday']}
                        } else if (simulation_type == "progress_log") {  // progress log
                            if (j == 0) {temp[j] = data[i]['task_id']}
                            if (j == 1) {temp[j] = data[i]['task']}
                            if (j == 2) {temp[j] = data[i]['deadline']}
                            if (j == 3) {temp[j] = data[i]['emp_id']}
                            if (j == 4) {temp[j] = data[i]['name']}
                            if (j == 5) {temp[j] = data[i]['hour_spent']}
                            if (j == 6) {temp[j] = data[i]['progress']}
                        } else if (simulation_type == "student_status") {  // student status
                            if (j == 0) {temp[j] = data[i]['ID']}
                            if (j == 1) {temp[j] = data[i]['name']}
                            if (j == 2) {temp[j] = data[i]['num_tardy']}
                            if (j == 3) {temp[j] = data[i]['num_abs']}
                            if (j == 4) {temp[j] = data[i]['dis_action']}
                            if (j == 5) {temp[j] = data[i]['status']}
                        }
                    }

                    buffer[i] = temp;
                    buffer_copy[i] = temp.slice()
                    // return buffer;
                }

                this.add_empty_rows(10, ATT_NUM, buffer, buffer_copy);
            }
        });
    }

    fill_col_headers = (col_head, simulation_type) => {
        if (simulation_type == "attendance") {  // attendance
            col_head.push("ID");
            col_head.push("Name");
            col_head.push("Monday");
            col_head.push("Tuesday");
            col_head.push("Wednesday");
            col_head.push("Thursday");
            col_head.push("Friday");
            col_head.push("Saturday");
            col_head.push("Sunday");
        }
        if (simulation_type == "grade_book") {  // grade book
            col_head.push("ID");
            col_head.push("Name");
            col_head.push("MP1");
            col_head.push("MP2");
            col_head.push("MP3");
            col_head.push("MP4");
            col_head.push("Lab1");
            col_head.push("Lab2");
            col_head.push("Lab3");
            col_head.push("Lab4");
            col_head.push("Lab5");
            col_head.push("Lab6");
            col_head.push("Lab7");
            col_head.push("Exam1");
            col_head.push("Exam2");
            col_head.push("Final");
            col_head.push("Overall");
        }
        if (simulation_type == "check_book") {  // check book
            col_head.push("ID");
            col_head.push("number");
            col_head.push("date");
            col_head.push("Transaction");
            col_head.push("Withdraw");
            col_head.push("Deposit");
            col_head.push("Balance");
        }
        if (simulation_type == "monthly_expense") { // monthly expense
            col_head.push("ID");
            col_head.push("expenses");
            col_head.push("Jan");
            col_head.push("Feb");
            col_head.push("Mar");
            col_head.push("Apr");
            col_head.push("May");
            col_head.push("Jun");
            col_head.push("Jul");
            col_head.push("Aug");
            col_head.push("Sep");
            col_head.push("Oct");
            col_head.push("Nov");
            col_head.push("Dec");
        }
        if (simulation_type == "monthly_income") { // monthly income
            col_head.push("ID");
            col_head.push("income");
            col_head.push("Jan");
            col_head.push("Feb");
            col_head.push("Mar");
            col_head.push("Apr");
            col_head.push("May");
            col_head.push("Jun");
            col_head.push("Jul");
            col_head.push("Aug");
            col_head.push("Sep");
            col_head.push("Oct");
            col_head.push("Nov");
            col_head.push("Dec");
        }
        if (simulation_type == "employee_schedule_v1") { // schedule v1
            col_head.push("Employee ID");
            col_head.push("Name");
            col_head.push("Monday");
            col_head.push("Tuesday");
            col_head.push("Wednesday");
            col_head.push("Thursday");
            col_head.push("Friday");
            col_head.push("Saturday");
            col_head.push("Sunday");
        }
        if (simulation_type == "employee_schedule_v2") { // schedule v2
            col_head.push("Time Slot");
            col_head.push("Monday");
            col_head.push("Tuesday");
            col_head.push("Wednesday");
            col_head.push("Thursday");
            col_head.push("Friday");
            col_head.push("Saturday");
            col_head.push("Sunday");
        }
        if (simulation_type == "progress_log") { // progress log
            col_head.push("Task ID");
            col_head.push("Task");
            col_head.push("Deadline");
            col_head.push("Employee ID");
            col_head.push("Name");
            col_head.push("Hours Spent");
            col_head.push("Status");
        }

        if (simulation_type == "student_status") {
            col_head.push("ID");
            col_head.push("Name");
            col_head.push("Tardy");
            col_head.push("Absent");
            col_head.push("Disciplinary Action");
            col_head.push("Status");
        }
    }

    add_empty_rows = (num_row, num_att, buffer, buffer_copy) => {
        console.log("adding more rows!");
        for (var i = 0; i < num_row; i++) {
            let temp = []
            for (var j = 0; j < num_att; j++) {
                temp.push("");
            }
            buffer[buffer.length] = temp;
            buffer_copy[buffer_copy.length] = temp.slice();
        }
    }
}
module.exports = Utils