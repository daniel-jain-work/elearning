import { MutationFunction } from '@apollo/react-common';
import { Graphql } from '@cl/types';
import {
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  TextField
} from '@material-ui/core';
import { Autocomplete } from '@material-ui/lab';
import { defaultTimezone, TeacherExperience } from 'cl-common';
import { getAllCountries, getTimezone } from 'countries-and-timezones';
import React from 'react';
import ReactAvatarEditor from 'react-avatar-editor';
import { TeacherProfile } from '../teacher-queries';
import AvatarEditor from './avatar-editor';
import UserAvatar from './user-avatar';

interface Props {
  teacher: TeacherProfile;
  loading: boolean;
  handleSubmit: MutationFunction<Props, Graphql.EditTeacherVars>;
}

function getTimezoneOptions() {
  const countries = getAllCountries();
  const zoneList: string[] = [];
  const zoneGroup: Record<string, string> = {};

  Object.values(countries).forEach(country => {
    for (const zone of country.timezones) {
      const tz = getTimezone(zone);
      if (tz && !tz.aliasOf) {
        zoneList.push(zone);
        zoneGroup[zone] = country.name;
      }
    }
  });

  return {
    zoneList,
    zoneGroup
  };
}

export default function ProfileSettings(props: Props) {
  const [firstName, setFirstName] = React.useState(props.teacher.firstName);
  const [lastName, setLastName] = React.useState(props.teacher.lastName);
  const [bio, setBio] = React.useState(props.teacher.bio || '');
  const [phoneNumber, setPhoneNumber] = React.useState(
    props.teacher.phoneNumber || ''
  );

  const [experiences, setExperiences] = React.useState(
    props.teacher.experiences || []
  );

  const [timezone, setTimezone] = React.useState(
    props.teacher.timezone || defaultTimezone
  );

  const [avatarChanged, setAvatarChanged] = React.useState(false);
  const editorRef = React.createRef<ReactAvatarEditor>();
  const { zoneGroup, zoneList } = React.useMemo(getTimezoneOptions, []);

  return (
    <form
      onSubmit={evt => {
        evt.preventDefault();
        const variables: Graphql.EditTeacherVars = {
          id: props.teacher.id,
          experiences,
          firstName,
          lastName,
          bio,
          phoneNumber,
          timezone
        };

        if (avatarChanged && editorRef.current) {
          const imageData = editorRef.current.getImageScaledToCanvas().toDataURL();
          variables.avatar = {
            name: 'avatar',
            content: imageData
          };
        }

        return props.handleSubmit({
          variables
        });
      }}
    >
      <Card>
        <CardHeader
          title="Settings"
          subheader={props.teacher.email}
          avatar={<UserAvatar user={props.teacher} />}
        />
        <CardContent>
          <TextField
            label="First Name"
            margin="normal"
            value={firstName}
            onChange={evt => setFirstName(evt.target.value)}
            fullWidth
            required
          />
          <TextField
            label="Last Name"
            margin="normal"
            value={lastName}
            onChange={evt => setLastName(evt.target.value)}
            fullWidth
            required
          />
          <TextField
            label="Phone Number"
            margin="normal"
            value={phoneNumber}
            type="tel"
            onChange={evt => setPhoneNumber(evt.target.value)}
            fullWidth
            required
          />
          <Autocomplete
            multiple={false}
            disableClearable
            options={zoneList}
            onChange={(evt, zone) => setTimezone(zone)}
            value={timezone}
            groupBy={zone => zoneGroup[zone]}
            renderInput={params => (
              <TextField
                {...params}
                margin="normal"
                label="Your Timezone"
                fullWidth
              />
            )}
          />

          <TextField
            label="Bio"
            margin="normal"
            variant="outlined"
            multiline
            rows={5}
            value={bio}
            onChange={evt => setBio(evt.target.value)}
            fullWidth
            required
          />

          <Autocomplete
            options={Object.keys(TeacherExperience)}
            getOptionLabel={id => TeacherExperience[id]}
            onChange={(evt, value) => setExperiences(value)}
            multiple
            value={experiences}
            renderInput={params => (
              <TextField
                {...params}
                margin="normal"
                label="Tell us about your prior teaching experiences"
                fullWidth
              />
            )}
          />

          <AvatarEditor
            editorRef={editorRef}
            onImageChange={() => setAvatarChanged(true)}
          />
        </CardContent>
        <CardActions>
          <Button
            type="submit"
            color="primary"
            variant="contained"
            fullWidth
            disabled={props.loading}
          >
            Save Changes
          </Button>
        </CardActions>
      </Card>
    </form>
  );
}
