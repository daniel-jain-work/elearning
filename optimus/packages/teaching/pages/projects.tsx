import { useQuery } from '@apollo/react-hooks';
import { Graphql, Nullable } from '@cl/types';
import {
  Card,
  CardContent,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TablePagination,
  TableRow
} from '@material-ui/core';
import { Rating } from '@material-ui/lab';
import { DateTime } from 'luxon';
import * as React from 'react';
import Layout from '../client/components/layout';
import ProjectDetails from '../client/components/project-details';
import ProjectPreview from '../client/components/project-preview';
import { Project } from '../client/data-types';
import {
  ProjectListQuery,
  ProjectListQueryResults
} from '../client/project-queries';

export default function ProjectsPage() {
  const [rowsPerPage, setRowsPerPage] = React.useState(30);
  const [page, setPage] = React.useState(0);
  const [previewProject, setPreviewProject] = React.useState<Nullable<Project>>(
    null
  );

  const result = useQuery<ProjectListQueryResults, Graphql.ListProjectsVars>(
    ProjectListQuery,
    {
      fetchPolicy: 'cache-and-network',
      variables: {
        offset: rowsPerPage * page,
        limit: rowsPerPage
      }
    }
  );

  const list = result.data?.list;

  return (
    <Layout queryResult={result}>
      <Card>
        <CardHeader title="Projects" />
        <CardContent>
          {list && (
            <Table style={{ overflowX: 'auto' }}>
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Preview</TableCell>
                  <TableCell>Student</TableCell>
                  <TableCell>Subject</TableCell>
                  <TableCell>Rating</TableCell>
                  <TableCell>Updated</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {list.rows.map(project => (
                  <TableRow
                    key={project.id}
                    onClick={() => setPreviewProject(project)}
                  >
                    <TableCell>{project.title}</TableCell>
                    <TableCell>
                      <ProjectPreview url={project.preview} size={80} />
                    </TableCell>
                    <TableCell>{project.student.name}</TableCell>
                    <TableCell>{project.subject?.name}</TableCell>
                    <TableCell>
                      <Rating value={project.featured} readOnly max={5} />
                    </TableCell>
                    <TableCell>
                      {DateTime.fromISO(project.updatedAt).toFormat('DDD')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow key="footer">
                  <TablePagination
                    colSpan={50}
                    count={list ? list.count : 0}
                    rowsPerPage={rowsPerPage}
                    rowsPerPageOptions={[]}
                    page={page}
                    onChangePage={(evt, page) => setPage(page)}
                    onChangeRowsPerPage={evt => {
                      setRowsPerPage(parseInt(evt.target.value));
                      setPage(0);
                    }}
                  />
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>
      {previewProject && (
        <ProjectDetails
          project={previewProject}
          open
          onClose={() => {
            setPreviewProject(null);
          }}
        />
      )}
    </Layout>
  );
}
