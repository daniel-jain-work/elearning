import { Nullable } from '@cl/types';
import { FormControl, InputLabel, NativeSelect } from '@material-ui/core';
import React from 'react';
import { Student } from '../../data-types';

interface Props {
  students: Student[];
  selected: Nullable<Student>;
  handleChange: (student: Student) => void;
}

function SelectStudent(props: Props) {
  const studentLookup: { [id: string]: Student } = {};

  const options = props.students.map(s => {
    studentLookup[s.id] = s;
    return (
      <option key={s.id} value={s.id}>
        {s.name}
      </option>
    );
  });

  return (
    <FormControl fullWidth margin="dense">
      <InputLabel>Select a Student</InputLabel>
      <NativeSelect
        value={props.selected ? props.selected.id : ''}
        onChange={evt => props.handleChange(studentLookup[evt.target.value])}
      >
        <option value="" disabled />
        {options}
      </NativeSelect>
    </FormControl>
  );
}

export default React.memo(SelectStudent);
