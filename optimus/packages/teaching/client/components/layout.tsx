import { QueryResult } from '@apollo/react-common';
import {
  AppBar,
  Container,
  IconButton,
  LinearProgress,
  makeStyles,
  Toolbar,
  Tooltip
} from '@material-ui/core';
import {
  BookOutlined,
  ExitToAppOutlined,
  FeaturedPlayListOutlined,
  HomeOutlined,
  SettingsOutlined
} from '@material-ui/icons';
import { commonRoutes, siteLogoUrl } from 'cl-common';
import React from 'react';

const useStyles = makeStyles(theme => ({
  root: {
    width: '100%',
    position: 'relative',
    padding: theme.spacing(3, 0)
  },

  grow: {
    flexGrow: 1
  },

  navs: {
    '&>a': {
      padding: theme.spacing(1),
      color: 'inherit'
    }
  },

  logo: {
    display: 'block',
    padding: theme.spacing(1, 0),
    '&>img': {
      height: 32
    }
  }
}));

interface Props {
  children?: React.ReactNode;
  queryResult?: QueryResult;
}

export default function Layour(props: Props) {
  const classes = useStyles();

  let loader: React.ReactNode = null;
  if (props.queryResult && !props.queryResult.data && props.queryResult.loading) {
    loader = (
      <LinearProgress
        color="secondary"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0
        }}
      />
    );
  }

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <a href="/" className={classes.logo}>
            <img src={siteLogoUrl} />
          </a>
          <div className={classes.grow} />
          <div className={classes.navs}>
            <IconButton href="/" title="Home">
              <HomeOutlined />
            </IconButton>
            <Tooltip title="Courses You Teach">
              <IconButton href="/courses">
                <BookOutlined />
              </IconButton>
            </Tooltip>
            <Tooltip title="Student Projects">
              <IconButton href="/projects">
                <FeaturedPlayListOutlined />
              </IconButton>
            </Tooltip>
            <Tooltip title="Account & Settings">
              <IconButton href="/settings">
                <SettingsOutlined />
              </IconButton>
            </Tooltip>
            <Tooltip title="Logout">
              <IconButton href={commonRoutes.signout}>
                <ExitToAppOutlined />
              </IconButton>
            </Tooltip>
          </div>
        </Toolbar>
      </AppBar>
      <div className={classes.root}>
        {loader}
        {props.children && <Container>{props.children}</Container>}
      </div>
    </>
  );
}
